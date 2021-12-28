#include "ReverseIndexItem.h"

namespace comm {
namespace network {
namespace database {

const std::string ReverseIndexItem::FIELD_REVERSE_INDEX = "reverseIndex";
const std::string ReverseIndexItem::FIELD_FILE_HASH = "fileHash";

ReverseIndexItem::ReverseIndexItem(
    const std::string reverseIndex,
    const std::string fileHash)
    : reverseIndex(reverseIndex), fileHash(fileHash) {
  this->validate();
}
ReverseIndexItem::ReverseIndexItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void ReverseIndexItem::validate() const {
  // todo consider more checks here for valid values e.g. fileHash size
  if (!this->reverseIndex.size()) {
    throw std::runtime_error("reverse index empty");
  }
  if (!this->fileHash.size()) {
    throw std::runtime_error("fileHash empty");
  }
}

void ReverseIndexItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  try {
    this->reverseIndex =
        itemFromDB.at(ReverseIndexItem::FIELD_REVERSE_INDEX).GetS();
    this->fileHash = itemFromDB.at(ReverseIndexItem::FIELD_FILE_HASH).GetS();
  } catch (std::out_of_range &e) {
    std::string errorMessage = "invalid reverse index item provided, ";
    errorMessage += e.what();
    throw std::runtime_error(errorMessage);
  }
  this->validate();
}

const std::string ReverseIndexItem::getTableName() const {
  return ReverseIndexItem::tableName;
}

const std::string ReverseIndexItem::getPrimaryKey() const {
  return ReverseIndexItem::FIELD_REVERSE_INDEX;
}

const std::string ReverseIndexItem::getReverseIndex() const {
  return this->reverseIndex;
}

const std::string ReverseIndexItem::getFileHash() const {
  return this->fileHash;
}

} // namespace database
} // namespace network
} // namespace comm
