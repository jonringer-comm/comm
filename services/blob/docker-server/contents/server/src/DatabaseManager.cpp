#include "DatabaseManager.h"
#include "AwsObjectsFactory.h"
#include "Tools.h"

#include <aws/core/utils/Outcome.h>
#include <aws/dynamodb/model/DeleteItemRequest.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/QueryRequest.h>
#include <aws/dynamodb/model/ScanRequest.h>

#include <iostream>
#include <vector>

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

// the key is either
//  - fileHash for blob items
//  - reverseIndex for reverse index items
void DatabaseManager::innerRemoveItem(
    const std::string &key,
    const ItemType &itemType) {
  Aws::DynamoDB::Model::DeleteItemRequest request;
  // I couldn't avoid DRY here as those requests inherit from DynamoDBRequest
  // and that class does not have a method `SetTableName`
  std::shared_ptr<Item> item = createItemByType(itemType);
  request.SetTableName(item->getTableName());
  request.AddKey(
      item->getPrimaryKey(), Aws::DynamoDB::Model::AttributeValue(key));

  const Aws::DynamoDB::Model::DeleteItemOutcome &outcome =
      AwsObjectsFactory::getDynamoDBClient()->DeleteItem(request);
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
      BlobItem::FIELD_S3PATH,
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
  return std::move(std::dynamic_pointer_cast<database::BlobItem>(
      this->innerFindItem(request, ItemType::BLOB)));
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

  return std::dynamic_pointer_cast<database::ReverseIndexItem>(
      this->innerFindItem(request, ItemType::REVERSE_INDEX));
}

std::vector<std::shared_ptr<database::ReverseIndexItem>>
DatabaseManager::findReverseIndexItemsByHash(const std::string &fileHash) {
  std::vector<std::shared_ptr<database::ReverseIndexItem>> result;

  Aws::DynamoDB::Model::QueryRequest req;
  req.SetTableName(ReverseIndexItem::tableName);
  req.SetKeyConditionExpression("fileHash = :valueToMatch");

  AttributeValues attributeValues;
  attributeValues.emplace(":valueToMatch", fileHash);

  req.SetExpressionAttributeValues(attributeValues);
  req.SetIndexName("fileHash-index");

  const Aws::DynamoDB::Model::QueryOutcome &outcome =
      AwsObjectsFactory::getDynamoDBClient()->Query(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  const Aws::Vector<AttributeValues> &items = outcome.GetResult().GetItems();
  for (auto &item : items) {
    result.push_back(std::make_shared<database::ReverseIndexItem>(item));
  }

  return result;
}

void DatabaseManager::removeReverseIndexItem(const std::string &reverseIndex) {
  std::shared_ptr<database::ReverseIndexItem> item =
      findReverseIndexItemByReverseIndex(reverseIndex);
  if (item == nullptr) {
    throw std::runtime_error(std::string(
        "no reverse index item found for reverse index " + reverseIndex));
  }
  this->innerRemoveItem(item->getReverseIndex(), ItemType::REVERSE_INDEX);
}

// we should pay attention how this is going to scale
std::vector<std::string> DatabaseManager::getAllHashes() {
  Aws::DynamoDB::Model::ScanRequest req;
  req.SetTableName(BlobItem::tableName);

  std::vector<std::string> result;

  // Perform scan on table
  const Aws::DynamoDB::Model::ScanOutcome &outcome =
      AwsObjectsFactory::getDynamoDBClient()->Scan(req);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  // Reference the retrieved items
  const Aws::Vector<AttributeValues> &retreivedItems =
      outcome.GetResult().GetItems();
  // std::cout << "Number of items retrieved from scan: " << items.size() <<
  // std::endl;
  // Iterate each item and print
  for (const auto &retreivedItem : retreivedItems) {
    // std::cout << "******************************************************" <<
    // std::endl; Output each retrieved field and its value
    BlobItem item(retreivedItem);
    result.push_back(item.getFileHash());
    // for (const auto &itemData : item) {
    //   // std::cout << i.first << ": " << i.second.GetS() << std::endl;
    //   if (itemData.first == "fileHash") {
    //     result.push_back(itemData.second.GetS());
    //   }
    // }
  }
  return result;
}

} // namespace database
} // namespace network
} // namespace comm
