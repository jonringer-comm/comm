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

void BlobServiceImpl::verifyFileHash(
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
        assignVariableIfEmpty(
            "reverse index", reverseIndex, requestReverseIndex);
      } else if (requestFileHash.size()) {
        assignVariableIfEmpty(
            "reverse index", receivedFileHash, requestFileHash);
      } else if (receivedDataChunk.size()) {
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
        if (currentChunk.size() > AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
          uploader->addPart(currentChunk);
          currentChunk.clear();
        }
      }
      if (reverseIndex.size() && receivedFileHash.size() && s3Path == nullptr) {
        blobItem = database::DatabaseManager::getInstance().findBlobItem(
            receivedFileHash);
        if (blobItem != nullptr) {
          s3Path = std::make_unique<database::S3Path>(blobItem->getS3Path());
          break;
        } else {
          s3Path = std::make_unique<database::S3Path>(
              Tools::getInstance().generateS3Path(
                  BLOB_BUCKET_NAME, receivedFileHash));
        }
      }
    }
    if (!currentChunk.empty()) {
      uploader->addPart(currentChunk);
    }
    if (blobItem == nullptr) {
      uploader->finishUpload();
    }
    // // compute a fileHash and verify with a provided fileHash
    this->verifyFileHash(receivedFileHash, *s3Path);
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

/*
(findReverseIndexItemByReverseIndex)- search for the file location on S3 in the
database by the reverse index
*/
grpc::Status BlobServiceImpl::Get(
    grpc::ServerContext *context,
    const blob::GetRequest *request,
    grpc::ServerWriter<blob::GetResponse> *writer) {
  const std::string reverseIndex = request->reverseindex();
  try {
    database::S3Path s3Path = Tools::getInstance().findS3Path(reverseIndex);

    AwsS3Bucket bucket =
        AwsStorageManager::getInstance().getBucket(s3Path.getBucketName());
    blob::GetResponse response;
    std::function<void(const std::string &)> callback =
        [&response, &writer](std::string chunk) {
          response.set_datachunk(chunk);
          if (!writer->Write(response)) {
            throw std::runtime_error("writer interrupted sending data");
          }
        };

    bucket.getObjectDataChunks(
        s3Path.getObjectName(),
        callback,
        GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

} // namespace network
} // namespace comm
