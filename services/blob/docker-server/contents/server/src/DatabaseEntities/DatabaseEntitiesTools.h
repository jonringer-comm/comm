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

template <typename T> std::shared_ptr<T> createItemByType() {
  return nullptr;
}

template <> std::shared_ptr<BlobItem> createItemByType<BlobItem>();

template <>
std::shared_ptr<ReverseIndexItem> createItemByType<ReverseIndexItem>();

} // namespace database
} // namespace network
} // namespace comm
