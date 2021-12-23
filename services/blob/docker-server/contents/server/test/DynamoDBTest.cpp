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

  std::cout << "==> create db manager" << std::endl;
  std::cout << "==> put item" << std::endl;
  DatabaseManager::getInstance().putBlobItem(item);
  std::cout << "==> find item" << std::endl;
  std::shared_ptr<BlobItem> foundItem =
      DatabaseManager::getInstance().findBlobItem(item.getFileHash());
  EXPECT_NE(foundItem->getCreated(), 0);
  std::cout << "==> checking fileHashes" << std::endl;
  EXPECT_EQ(item.getFileHash().size(), foundItem->getFileHash().size());
  EXPECT_EQ(
      memcmp(
          item.getFileHash().data(),
          foundItem->getFileHash().data(),
          item.getFileHash().size()),
      0);
  std::cout << "==> put another item item" << std::endl;
  const BlobItem item2(generateName(), S3Path(generateName(), generateName()));
  DatabaseManager::getInstance().putBlobItem(item2);
  std::cout << "==> get all hashes" << std::endl;
  const std::vector<std::string> allHashes =
      DatabaseManager::getInstance().getAllHashes();
  EXPECT_EQ(allHashes.size(), 2);
  EXPECT_TRUE(
      std::find(allHashes.begin(), allHashes.end(), item.getFileHash()) !=
      allHashes.end());
  EXPECT_TRUE(
      std::find(allHashes.begin(), allHashes.end(), item2.getFileHash()) !=
      allHashes.end());
  std::cout << "==> remove item" << std::endl;
  DatabaseManager::getInstance().removeBlobItem(item.getFileHash());
  DatabaseManager::getInstance().removeBlobItem(item2.getFileHash());
  std::cout << "==> done" << std::endl;
}

TEST_F(DatabaseManagerTest, TestOperationsOnReverseIndexItems) {
  const ReverseIndexItem item(generateName(), generateName());

  std::cout << "==> create db manager" << std::endl;
  std::cout << "==> put item" << std::endl;
  DatabaseManager::getInstance().putReverseIndexItem(item);
  std::cout << "==> find item by fileHash" << std::endl;
  std::vector<std::shared_ptr<ReverseIndexItem>> foundItems =
      DatabaseManager::getInstance().findReverseIndexItemsByHash(
          item.getFileHash());
  EXPECT_EQ(foundItems.size(), 1);
  std::shared_ptr<ReverseIndexItem> foundItem = foundItems.at(0);
  std::cout << "==> checking fileHashes" << std::endl;
  EXPECT_EQ(item.getFileHash().size(), foundItem->getFileHash().size());
  EXPECT_EQ(
      memcmp(
          item.getFileHash().data(),
          foundItem->getFileHash().data(),
          item.getFileHash().size()),
      0);
  std::cout << "==> find item by reverse index" << std::endl;
  foundItem = std::dynamic_pointer_cast<ReverseIndexItem>(
      DatabaseManager::getInstance().findReverseIndexItemByReverseIndex(
          item.getReverseIndex()));
  std::cout << "==> checking fileHashes" << std::endl;
  EXPECT_EQ(item.getFileHash().size(), foundItem->getFileHash().size());
  EXPECT_EQ(
      memcmp(
          item.getFileHash().data(),
          foundItem->getFileHash().data(),
          item.getFileHash().size()),
      0);
  std::cout << "==> remove item" << std::endl;
  DatabaseManager::getInstance().removeReverseIndexItem(
      foundItem->getReverseIndex());
  std::cout << "==> done" << std::endl;
}
