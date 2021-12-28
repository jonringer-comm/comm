#pragma once

#include "Item.h"
#include "S3Path.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class BlobItem : public Item {

  std::string blobHash;
  S3Path s3Path;
  long long created = 0;

  void validate() const override;

public:
  static std::string tableName;
  static const std::string FIELD_FILE_HASH;
  static const std::string FIELD_S3_PATH;
  static const std::string FIELD_CREATED;

  BlobItem() {
  }
  BlobItem(const std::string blobHash, const S3Path s3Path);
  BlobItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  const std::string getTableName() const override;
  const std::string getPrimaryKey() const override;

  const std::string getBlobHash() const;
  const S3Path getS3Path() const;
  const long long getCreated() const;
};

} // namespace database
} // namespace network
} // namespace comm
