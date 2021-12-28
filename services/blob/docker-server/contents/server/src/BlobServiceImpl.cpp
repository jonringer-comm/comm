#include "BlobServiceImpl.h"

#include "AwsStorageManager.h"
#include "AwsTools.h"
#include "DatabaseManager.h"
#include "MultiPartUploader.h"
#include "Tools.h"

#include <iostream>
#include <memory>

namespace comm {
namespace network {

BlobServiceImpl::BlobServiceImpl() {
  Aws::InitAPI({});

  if (!AwsStorageManager::getInstance()
           .getBucket(BLOB_BUCKET_NAME)
           .isAvailable()) {
    throw std::runtime_error("bucket " + BLOB_BUCKET_NAME + " not available");
  }
}

BlobServiceImpl::~BlobServiceImpl() {
  Aws::ShutdownAPI({});
}

void BlobServiceImpl::putHandleHashes(
    const std::string &expectedFileHash,
    const database::S3Path &s3Path) {
  const std::string computedFileHash =
      expectedFileHash; // this->computeHashForFile(*s3Path); // TODO FIX THIS
  if (expectedFileHash != computedFileHash) {
    std::string errorMessage = "fileHash mismatch, expected: [";
    errorMessage +=
        expectedFileHash + "], computed: [" + computedFileHash + "]";
    throw std::runtime_error(errorMessage);
  }
}

void BlobServiceImpl::assignVariableIfEmpty(
    const std::string &label,
    std::string &lvalue,
    const std::string &rvalue) {
  if (!lvalue.empty()) {
    std::string errorMessage = "multiple assignment for variable ";
    errorMessage += label + " is not allowed";
    throw std::runtime_error(errorMessage);
  }
  lvalue = rvalue;
}

/*
(findBlobItem)- Search for the fileHash in the database, if it doesn't exist:
  (-)- create a place for this file and upload it to the S3
  (-)- compute a fileHash of the uploaded file and verify that it's the same as
    provided in the argument
  (putBlobItem)- store a fileHash and a place where the file was saved in the DB
(putReverseIndexItem)- store a reverse index in the DB for a
given fileHash
*/
grpc::Status BlobServiceImpl::Put(
    grpc::ServerContext *context,
    grpc::ServerReader<blob::PutRequest> *reader,
    google::protobuf::Empty *response) {
  blob::PutRequest request;
  std::string reverseIndex;
  std::string receivedFileHash;
  std::unique_ptr<database::S3Path> s3Path;
  std::shared_ptr<database::BlobItem> blobItem;
  std::unique_ptr<MultiPartUploader> uploader;
  std::string currentChunk;
  try {
    while (reader->Read(&request)) {
      const std::string requestReverseIndex = request.reverseindex();
      const std::string requestFileHash = request.filehash();
      const std::string receivedDataChunk = request.datachunk();
      if (requestReverseIndex.size()) {
        std::cout << "Blob Service => Put(this log will be removed) "
                     "reading reverse index ["
                  << requestReverseIndex << "]" << std::endl;
        assignVariableIfEmpty(
            "reverse index", reverseIndex, requestReverseIndex);
      } else if (requestFileHash.size()) {
        std::cout << "Backup Service => Put(this log will be removed) "
                     "reading file fileHash ["
                  << requestFileHash << "]" << std::endl;
        assignVariableIfEmpty(
            "reverse index", receivedFileHash, requestFileHash);
      } else if (receivedDataChunk.size()) {
        std::cout << "Backup Service => Put(this log will be removed) "
                     "reading chunk ["
                  << receivedDataChunk.size() << "]" << std::endl;
        if (s3Path == nullptr) {
          throw std::runtime_error(
              "S3 path or/and MPU has not been created but data "
              "chunks are being pushed");
        }
        if (uploader == nullptr) {
          uploader = std::make_unique<MultiPartUploader>(
              AwsObjectsFactory::getS3Client(),
              BLOB_BUCKET_NAME,
              s3Path->getObjectName());
        }
        currentChunk += receivedDataChunk;
        std::cout << "current data chunk: " << currentChunk.size() << " ?< "
                  << AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE << std::endl;
        if (currentChunk.size() > AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
          std::cout << "adding chunk to uploader " << currentChunk.size()
                    << std::endl;
          uploader->addPart(currentChunk);
          currentChunk.clear();
        }
      }
      if (reverseIndex.size() && receivedFileHash.size() && s3Path == nullptr) {
        std::cout << "create S3 Path" << std::endl;
        blobItem = database::DatabaseManager::getInstance().findBlobItem(
            receivedFileHash);
        if (blobItem != nullptr) {
          std::cout << "S3 Path exists: " << blobItem->getS3Path().getFullPath()
                    << std::endl;
          // todo terminate reader is necessary here?
          break;
        } else {
          s3Path = std::make_unique<database::S3Path>(
              Tools::getInstance().generateS3Path(
                  BLOB_BUCKET_NAME, receivedFileHash));
          std::cout << "created new S3 Path: " << s3Path->getFullPath()
                    << std::endl;
        }
      }
    }
    if (!currentChunk.empty()) {
      std::cout << "add last part to MPU " << currentChunk.size() << std::endl;
      uploader->addPart(currentChunk);
    }
    std::cout << "finish uploader" << std::endl;
    uploader->finishUpload();
    // // compute a fileHash and verify with a provided fileHash
    this->putHandleHashes(receivedFileHash, *s3Path);
    // putBlobItem - store a fileHash and a path in the DB
    if (blobItem == nullptr) {
      blobItem =
          std::make_shared<database::BlobItem>(receivedFileHash, *s3Path);
      database::DatabaseManager::getInstance().putBlobItem(*blobItem);
    }
    // putReverseIndexItem - store a reverse index in the DB for a given
    // fileHash
    const database::ReverseIndexItem reverseIndexItem(
        reverseIndex, receivedFileHash);
    database::DatabaseManager::getInstance().putReverseIndexItem(
        reverseIndexItem);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

} // namespace network
} // namespace comm
