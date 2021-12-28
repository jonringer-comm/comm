#include "BlobItem.h"

namespace comm {
namespace network {
namespace database {

const std::string BlobItem::FIELD_FILE_HASH = "fileHash";
const std::string BlobItem::FIELD_S3_PATH = "s3Path";
const std::string BlobItem::FIELD_CREATED = "created";

BlobItem::BlobItem(const std::string fileHash, const S3Path s3Path)
    : fileHash(fileHash), s3Path(s3Path) {
  this->validate();
}

BlobItem::BlobItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void BlobItem::validate() const {
  // todo consider more checks here for valid values e.g. fileHash size
  if (!this->fileHash.size()) {
    throw std::runtime_error("fileHash empty");
  }
  this->s3Path.getFullPath();
}

void BlobItem::assignItemFromDatabase(const AttributeValues &itemFromDB) {
  try {
    this->fileHash = itemFromDB.at(BlobItem::FIELD_FILE_HASH).GetS();
    this->s3Path = S3Path(itemFromDB.at(BlobItem::FIELD_S3_PATH).GetS());
    this->created = std::stoll(
        std::string(itemFromDB.at(BlobItem::FIELD_CREATED).GetS()).c_str());
  } catch (std::out_of_range &e) {
    std::string errorMessage = "invalid blob item provided, ";
    errorMessage += e.what();
    throw std::runtime_error(errorMessage);
  }
  this->validate();
}

const std::string BlobItem::getTableName() const {
  return BlobItem::tableName;
}

const std::string BlobItem::getPrimaryKey() const {
  return BlobItem::FIELD_FILE_HASH;
}

const std::string BlobItem::getFileHash() const {
  return this->fileHash;
}

const S3Path BlobItem::getS3Path() const {
  return this->s3Path;
}

const long long BlobItem::getCreated() const {
  return this->created;
}

} // namespace database
} // namespace network
} // namespace comm
