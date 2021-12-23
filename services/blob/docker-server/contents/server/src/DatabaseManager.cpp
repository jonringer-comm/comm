#include "DatabaseManager.h"
#include "AwsObjectsFactory.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/GetItemRequest.h>

#include <iostream>

namespace comm {
namespace network {
namespace database {

std::string BlobItem::tableName = "blob-service-blob";
std::string ReverseIndexItem::tableName = "blob-service-reverse-index";

DatabaseManager &DatabaseManager::getInstance() {
  static DatabaseManager instance;
  return instance;
}

void DatabaseManager::innerPutItem(
    std::shared_ptr<Item> item,
    const Aws::DynamoDB::Model::PutItemRequest &request) {
  const Aws::DynamoDB::Model::PutItemOutcome outcome =
      AwsObjectsFactory::getDynamoDBClient()->PutItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

std::shared_ptr<Item> DatabaseManager::innerFindItem(
    Aws::DynamoDB::Model::GetItemRequest &request,
    const ItemType &itemType) {
  std::shared_ptr<Item> item = createItemByType(itemType);
  // Set up the request
  request.SetTableName(item->getTableName());
  // Retrieve the item's fields and values
  const Aws::DynamoDB::Model::GetItemOutcome &outcome =
      AwsObjectsFactory::getDynamoDBClient()->GetItem(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const AttributeValues &outcomeItem = outcome.GetResult().GetItem();
  if (!outcomeItem.size()) {
    // todo print a fileHash here
    std::cout << "no item found" << std::endl;
    return nullptr;
  }
  item->assignItemFromDatabase(outcomeItem);
  return std::move(item);
}

} // namespace database
} // namespace network
} // namespace comm
