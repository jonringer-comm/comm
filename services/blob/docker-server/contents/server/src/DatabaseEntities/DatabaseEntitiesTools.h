#pragma once

#include "Item.h"

// include following files so just including this file we get access to them
#include "BlobItem.h"
#include "ReverseIndexItem.h"

#include <memory>

namespace comm {
namespace network {
namespace database {

/**
 * Database Structure:
 * blob
 *  fileHash            string
 *  s3Path              string
 *  created             timestamp
 * reverse_index
 *  reverseIndex        string
 *  fileHash            string
 */
enum class ItemType {
  BLOB = 0,
  REVERSE_INDEX = 1,
};

std::shared_ptr<Item> createItemByType(const ItemType &itemType);

} // namespace database
} // namespace network
} // namespace comm
