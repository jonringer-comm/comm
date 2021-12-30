#pragma once

#include "Item.h"
#include <string>

namespace comm {
namespace network {
namespace database {

class DeviceSessionItem : public Item {
  std::string notifyToken;
  std::string typeOS;
  long long checkpointTime = 0;

public:
  static std::string tableName;
  // Items attributes name
  static const std::string FIELD_NOTIFY_TOKEN;
  static const std::string FIELD_TYPE_OS;
  static const std::string FIELD_CHECKPOINT_TIME;

  DeviceSessionItem() {
  }
  DeviceSessionItem(const AttributeValues &itemFromDB);
  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  // Getters
  const std::string getNotifyToken() const;
  const std::string getTypeOS() const;
  const long long getCheckpointTime() const;
};

} // namespace database
} // namespace network
} // namespace comm
