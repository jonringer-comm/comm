#include "DatabaseEntitiesTools.h"

namespace comm {
namespace network {
namespace database {

std::shared_ptr<Item> createItemByType(const ItemType &itemType) {
  switch (itemType) {
    case ItemType::BLOB:
      return std::make_shared<BlobItem>();
    case ItemType::REVERSE_INDEX:
      return std::make_shared<ReverseIndexItem>();
  }
  return nullptr;
}

} // namespace database
} // namespace network
} // namespace comm
