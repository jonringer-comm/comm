#include "DatabaseManager.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>

#include <iostream>

namespace comm {
namespace network {
namespace database {

std::string BlobItem::tableName = BLOB_TABLE_NAME;
std::string ReverseIndexItem::tableName = REVERSE_INDEX_TABLE_NAME;

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

} // namespace database
} // namespace network
} // namespace comm
