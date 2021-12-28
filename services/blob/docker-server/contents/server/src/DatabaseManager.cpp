#include "DatabaseManager.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>

#include <iostream>
#include <vector>

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

void DatabaseManager::putBlobItem(const BlobItem &item) {
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(BlobItem::tableName);
  request.AddItem(
      BlobItem::FIELD_FILE_HASH,
      Aws::DynamoDB::Model::AttributeValue(item.getFileHash()));
  request.AddItem(
      BlobItem::FIELD_S3_PATH,
      Aws::DynamoDB::Model::AttributeValue(item.getS3Path().getFullPath()));
  request.AddItem(
      BlobItem::FIELD_CREATED,
      Aws::DynamoDB::Model::AttributeValue(
          std::to_string(Tools::getInstance().getCurrentTimestamp())));

  this->innerPutItem(std::make_shared<BlobItem>(item), request);
}

std::shared_ptr<BlobItem>
DatabaseManager::findBlobItem(const std::string &fileHash) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      BlobItem::FIELD_FILE_HASH,
      Aws::DynamoDB::Model::AttributeValue(fileHash));
  return std::move(this->innerFindItem<BlobItem>(request));
}

void DatabaseManager::putReverseIndexItem(const ReverseIndexItem &item) {
  if (this->findReverseIndexItemByReverseIndex(item.getReverseIndex()) !=
      nullptr) {
    std::string errorMessage = "An item for the given reverse index [";
    errorMessage += item.getReverseIndex();
    errorMessage += "] already exists";
    throw std::runtime_error(errorMessage);
  }
  Aws::DynamoDB::Model::PutItemRequest request;
  request.SetTableName(ReverseIndexItem::tableName);
  request.AddItem(
      ReverseIndexItem::FIELD_REVERSE_INDEX,
      Aws::DynamoDB::Model::AttributeValue(item.getReverseIndex()));
  request.AddItem(
      ReverseIndexItem::FIELD_FILE_HASH,
      Aws::DynamoDB::Model::AttributeValue(item.getFileHash()));

  this->innerPutItem(std::make_shared<ReverseIndexItem>(item), request);
}

std::shared_ptr<ReverseIndexItem>
DatabaseManager::findReverseIndexItemByReverseIndex(
    const std::string &reverseIndex) {
  Aws::DynamoDB::Model::GetItemRequest request;
  request.AddKey(
      ReverseIndexItem::FIELD_REVERSE_INDEX,
      Aws::DynamoDB::Model::AttributeValue(reverseIndex));

  return std::move(this->innerFindItem<ReverseIndexItem>(request));
}

} // namespace database
} // namespace network
} // namespace comm
