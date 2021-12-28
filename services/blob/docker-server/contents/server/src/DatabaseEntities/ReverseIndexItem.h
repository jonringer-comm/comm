#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class ReverseIndexItem : public Item {

  std::string reverseIndex;
  std::string fileHash;

  void validate() const override;

public:
  static std::string tableName;
  static const std::string FIELD_REVERSE_INDEX;
  static const std::string FIELD_FILE_HASH;

  ReverseIndexItem() {
  }
  ReverseIndexItem(const std::string reverseIndex, const std::string fileHash);
  ReverseIndexItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  const std::string getTableName() const override;
  const std::string getPrimaryKey() const override;
  const std::string getReverseIndex() const;
  const std::string getFileHash() const;
};

} // namespace database
} // namespace network
} // namespace comm
