#include "Tools.h"

#include "DatabaseEntitiesTools.h"
#include "DatabaseManager.h"

#include <chrono>

namespace comm {
namespace network {

database::S3Path Tools::generateS3Path(
    const std::string &bucketName,
    const std::string &fileHash) {
  // todo this may change
  return database::S3Path(bucketName, fileHash);
}

std::string Tools::computeHashForFile(const database::S3Path &s3Path) {
  return database::BlobItem::FIELD_FILE_HASH; // TODO
}

database::S3Path Tools::findS3Path(const std::string &reverseIndex) {
  std::shared_ptr<database::ReverseIndexItem> reverseIndexItem =
      database::DatabaseManager::getInstance()
          .findReverseIndexItemByReverseIndex(reverseIndex);
  if (reverseIndexItem == nullptr) {
    std::string errorMessage = "provided reverse index: [";
    errorMessage += reverseIndex + "] has not been found in the database";
    throw std::runtime_error(errorMessage);
  }
  std::shared_ptr<database::BlobItem> blobItem =
      database::DatabaseManager::getInstance().findBlobItem(
          reverseIndexItem->getFileHash());
  if (blobItem == nullptr) {
    std::string errorMessage = "no blob found for fileHash: [";
    errorMessage += reverseIndexItem->getFileHash() + "]";
    throw std::runtime_error(errorMessage);
  }
  database::S3Path result = blobItem->getS3Path();
  return result;
}

database::S3Path
Tools::findS3Path(const database::ReverseIndexItem &reverseIndexItem) {
  std::shared_ptr<database::BlobItem> blobItem =
      database::DatabaseManager::getInstance().findBlobItem(
          reverseIndexItem.getFileHash());
  if (blobItem == nullptr) {
    std::string errorMessage = "no blob found for fileHash: [";
    errorMessage += reverseIndexItem.getFileHash() + "]";
    throw std::runtime_error(errorMessage);
  }
  database::S3Path result = blobItem->getS3Path();
  return result;
}

long long Tools::getCurrentTimestamp() {
  using namespace std::chrono;
  return duration_cast<milliseconds>(system_clock::now().time_since_epoch())
      .count();
}

} // namespace network
} // namespace comm
