#include "DeviceSessionItem.h"

namespace comm {
namespace network {
namespace database {

std::string DeviceSessionItem::tableName = DEVICE_SESSIONS_TABLE_NAME;
const std::string DeviceSessionItem::FIELD_NOTIFY_TOKEN = "NotifyToken";
const std::string DeviceSessionItem::FIELD_TYPE_OS = "TypeOS";
const std::string DeviceSessionItem::FIELD_CHECKPOINT_TIME = "CheckpointTime";

DeviceSessionItem::DeviceSessionItem(const AttributeValues &itemFromDB) {
  // TODO:
  // Data validation:
  // - empty strings;
  this->assignItemFromDatabase(itemFromDB);
}

void DeviceSessionItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  try {
    this->notifyToken =
        itemFromDB.at(DeviceSessionItem::FIELD_NOTIFY_TOKEN).GetS();
    this->typeOS = itemFromDB.at(DeviceSessionItem::FIELD_TYPE_OS).GetS();
    this->checkpointTime = std::stoll(
        std::string(
            itemFromDB.at(DeviceSessionItem::FIELD_CHECKPOINT_TIME).GetS())
            .c_str());
  } catch (std::out_of_range &e) {
    std::string errorMessage = "invalid device session database value ";
    errorMessage += e.what();
    throw std::runtime_error(errorMessage);
  }
}

std::string DeviceSessionItem::getTableName() const {
  return DeviceSessionItem::tableName;
}

std::string DeviceSessionItem::getNotifyToken() const {
  return this->notifyToken;
}

std::string DeviceSessionItem::getTypeOS() const {
  return this->typeOS;
}

long long DeviceSessionItem::getCheckpointTime() const {
  return this->checkpointTime;
}

} // namespace database
} // namespace network
} // namespace comm
