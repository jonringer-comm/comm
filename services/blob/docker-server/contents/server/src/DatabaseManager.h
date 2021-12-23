#pragma once

#include "DatabaseEntitiesTools.h"

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
  void innerRemoveItem(const std::string &key, const ItemType &itemType);

public:
  static DatabaseManager &getInstance();

  void putBlobItem(const BlobItem &item);
  std::shared_ptr<BlobItem> findBlobItem(const std::string &fileHash);
  void removeBlobItem(const std::string &fileHash);

  void putReverseIndexItem(const ReverseIndexItem &item);
  std::shared_ptr<ReverseIndexItem>
  findReverseIndexItemByReverseIndex(const std::string &reverseIndex);
  std::vector<std::shared_ptr<database::ReverseIndexItem>>
  findReverseIndexItemsByHash(const std::string &fileHash);
  void removeReverseIndexItem(const std::string &reverseIndex);

  std::vector<std::string> getAllHashes();
};

} // namespace database
} // namespace network
} // namespace comm
