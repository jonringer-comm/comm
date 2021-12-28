#include <gtest/gtest.h>

#include "DatabaseManager.h"
#include "S3Path.h"

#include <iostream>

#include <algorithm>
#include <chrono>
#include <memory>
#include <string>
#include <vector>

using namespace comm::network::database;

class DatabaseManagerTest : public testing::Test {
protected:
  virtual void SetUp() {
    Aws::InitAPI({});
  }

  virtual void TearDown() {
    Aws::ShutdownAPI({});
  }
};

std::string generateName() {
  std::chrono::milliseconds ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch());
  return std::to_string(ms.count());
}

TEST_F(DatabaseManagerTest, TestOperationsOnBlobItems) {
  const BlobItem item(generateName(), S3Path(generateName(), generateName()));

  DatabaseManager::getInstance().putBlobItem(item);
  std::shared_ptr<BlobItem> foundItem =
      DatabaseManager::getInstance().findBlobItem(item.getFileHash());
  EXPECT_NE(foundItem->getCreated(), 0);
  EXPECT_EQ(item.getFileHash().size(), foundItem->getFileHash().size());
  EXPECT_EQ(
      memcmp(
          item.getFileHash().data(),
          foundItem->getFileHash().data(),
          item.getFileHash().size()),
      0);
  const BlobItem item2(generateName(), S3Path(generateName(), generateName()));
  DatabaseManager::getInstance().putBlobItem(item2);
  DatabaseManager::getInstance().removeBlobItem(item.getFileHash());
  DatabaseManager::getInstance().removeBlobItem(item2.getFileHash());
}

TEST_F(DatabaseManagerTest, TestOperationsOnReverseIndexItems) {
  const ReverseIndexItem item(generateName(), generateName());

  DatabaseManager::getInstance().putReverseIndexItem(item);
  std::vector<std::shared_ptr<ReverseIndexItem>> foundItems =
      DatabaseManager::getInstance().findReverseIndexItemsByHash(
          item.getFileHash());
  EXPECT_EQ(foundItems.size(), 1);
  std::shared_ptr<ReverseIndexItem> foundItem = foundItems.at(0);
  EXPECT_EQ(item.getFileHash().size(), foundItem->getFileHash().size());
  EXPECT_EQ(
      memcmp(
          item.getFileHash().data(),
          foundItem->getFileHash().data(),
          item.getFileHash().size()),
      0);
  foundItem = std::dynamic_pointer_cast<ReverseIndexItem>(
      DatabaseManager::getInstance().findReverseIndexItemByReverseIndex(
          item.getReverseIndex()));
  EXPECT_EQ(item.getFileHash().size(), foundItem->getFileHash().size());
  EXPECT_EQ(
      memcmp(
          item.getFileHash().data(),
          foundItem->getFileHash().data(),
          item.getFileHash().size()),
      0);
  DatabaseManager::getInstance().removeReverseIndexItem(
      foundItem->getReverseIndex());
}
