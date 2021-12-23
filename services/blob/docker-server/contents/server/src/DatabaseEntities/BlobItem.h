#pragma once

#include "Item.h"
#include "S3Path.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class BlobItem : public Item {

  std::string fileHash;
  S3Path s3Path;
  long long created = 0;

  void validate() const override;

public:
  static std::string tableName;
  static const std::string FIELD_FILE_HASH;
  static const std::string FIELD_S3PATH;
  static const std::string FIELD_CREATED;

  BlobItem() {
  }
  BlobItem(const std::string fileHash, const S3Path s3Path);
  BlobItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB);

  const std::string getTableName() const;
  const std::string getPrimaryKey() const;

  const std::string getFileHash() const;
  const S3Path getS3Path() const;
  const long long getCreated() const;
};

} // namespace database
} // namespace network
} // namespace comm
