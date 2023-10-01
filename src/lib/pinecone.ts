import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

export const getPineconeClient = () => {
  return new Pinecone({
    environment: process.env.PINECONE_ENVIRONMENT!,
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  console.log("Downloading S3 file into the file system.");
  try {
    // Download and read from PDF.
    const file_name = await downloadFromS3(fileKey);
    if (!file_name) {
      console.error("Failed to download file from S3.");
      return null;
    }

    console.log("Loading PDF into memory: " + file_name);
    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];

    // Split and segment the PDF.
    const documents = await Promise.all(pages.map(prepareDocument));

    // Vectorize and embed individual documents.
    const vectors = await Promise.all(documents.flat().map(embedDocument));

    // Upload to Pinecone.
    const client = await getPineconeClient();
    const pineconeIndex = await client.index("viet-chatpdf");
    const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

    console.log("Inserting vectors into Pinecone.");
    await namespace.upsert(vectors);

    console.log("S3 file successfully loaded into Pinecone.");

    return documents[0];
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  // split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
