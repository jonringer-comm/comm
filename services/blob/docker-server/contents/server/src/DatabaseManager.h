#pragma once

#include "DatabaseEntities.h"

#include <aws/core/Aws.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/PutItemRequest.h>

#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace comm {
namespace network {
namespace database {

class DatabaseManager {

  void innerPutItem(
      std::shared_ptr<Item> item,
      const Aws::DynamoDB::Model::PutItemRequest &request);
  std::shared_ptr<Item> innerFindItem(
      Aws::DynamoDB::Model::GetItemRequest &request,
      const ItemType &itemType);

public:
  static DatabaseManager &getInstance();

  void putBlobItem(const BlobItem &item);
  std::shared_ptr<BlobItem> findBlobItem(const std::string &fileHash);

  void putReverseIndexItem(const ReverseIndexItem &item);
  std::shared_ptr<ReverseIndexItem>
  findReverseIndexItemByReverseIndex(const std::string &reverseIndex);
};

} // namespace database
} // namespace network
} // namespace comm
