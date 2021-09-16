#pragma once

#include "../CryptoTools/CryptoModule.h"
#include "../Tools/CommSecureStore.h"
#include "../Tools/WorkerThread.h"
#include "DatabaseManager.h"
#include "MessageStoreOperations.h"

#include <folly/Optional.h>

#include <string>
#include <vector>

namespace comm {

class CoreModuleInternal {
  CommSecureStore secureStore;
  const std::string secureStoreAccountDataKey = "cryptoAccountDataKey";
  void scheduleOrRun(
      const std::shared_ptr<WorkerThread> &thread,
      const taskType &task);

public:
  std::unique_ptr<crypto::CryptoModule> cryptoModule;
  std::string getDraft(const std::string &key);
  void updateDraft(const std::string &key, const std::string &text);
  bool moveDraft(const std::string &oldKey, const std::string &newKey);
  std::vector<Draft> getAllDrafts();
  void removeAllDrafts();

  void removeAllMessages();
  std::vector<Message> getAllMessages();

  void processMessageStoreOperations(
      const std::vector<std::shared_ptr<MessageStoreOperationBase>>
          &messageStoreOps);

  void initializeCryptoAccount(
      const std::string &userId,
      const std::shared_ptr<WorkerThread> databaseThread =
          std::shared_ptr<WorkerThread>(),
      const std::shared_ptr<WorkerThread> cryptoThread =
          std::shared_ptr<WorkerThread>(),
      const std::function<void(const std::string &)> result_handler = nullptr);
  std::string getUserPublicKey();
  std::string getUserOneTimeKeys();
};

} // namespace comm
