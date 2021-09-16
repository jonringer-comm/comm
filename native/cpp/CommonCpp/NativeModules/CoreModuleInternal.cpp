#include "CoreModuleInternal.h"
#include "DatabaseManager.h"

namespace comm {

std::string CoreModuleInternal::getDraft(const std::string &key) {
  return DatabaseManager::getQueryExecutor().getDraft(key);
}

void CoreModuleInternal::updateDraft(
    const std::string &key,
    const std::string &text) {
  DatabaseManager::getQueryExecutor().updateDraft(key, text);
}

bool CoreModuleInternal::moveDraft(
    const std::string &oldKey,
    const std::string &newKey) {
  return DatabaseManager::getQueryExecutor().moveDraft(oldKey, newKey);
}

std::vector<Draft> CoreModuleInternal::getAllDrafts() {
  return DatabaseManager::getQueryExecutor().getAllDrafts();
}

void CoreModuleInternal::removeAllDrafts() {
  DatabaseManager::getQueryExecutor().removeAllDrafts();
}

void CoreModuleInternal::removeAllMessages() {
  DatabaseManager::getQueryExecutor().removeAllMessages();
}

std::vector<Message> CoreModuleInternal::getAllMessages() {
  return DatabaseManager::getQueryExecutor().getAllMessages();
}

void CoreModuleInternal::processMessageStoreOperations(
    const std::vector<std::shared_ptr<MessageStoreOperationBase>>
        &messageStoreOps) {
  for (const auto &operation : messageStoreOps) {
    operation->execute();
  }
}

void CoreModuleInternal::scheduleOrRun(
    const std::shared_ptr<WorkerThread> &thread,
    const taskType &task) {
  if (thread != nullptr) {
    thread->scheduleTask(task);
  } else {
    task();
  }
}

void CoreModuleInternal::initializeCryptoAccount(
    const std::string &userId,
    const std::shared_ptr<WorkerThread> databaseThread,
    const std::shared_ptr<WorkerThread> cryptoThread,
    const std::function<void(const std::string &)> result_handler) {
  folly::Optional<std::string> storedSecretKey =
      this->secureStore.get(this->secureStoreAccountDataKey);
  if (!storedSecretKey.hasValue()) {
    storedSecretKey = crypto::Tools::getInstance().generateRandomString(64);
    this->secureStore.set(
        this->secureStoreAccountDataKey, storedSecretKey.value());
  }

  this->scheduleOrRun(databaseThread, [&]() {
    crypto::Persist persist;
    std::string error;
    try {
      folly::Optional<std::string> accountData =
          DatabaseManager::getQueryExecutor().getOlmPersistAccountData();
      if (accountData.hasValue()) {
        persist.account =
            crypto::OlmBuffer(accountData->begin(), accountData->end());
        // handle sessions data
        std::vector<OlmPersistSession> sessionsData =
            DatabaseManager::getQueryExecutor().getOlmPersistSessionsData();
        for (OlmPersistSession &sessionsDataItem : sessionsData) {
          crypto::OlmBuffer sessionDataBuffer(
              sessionsDataItem.session_data.begin(),
              sessionsDataItem.session_data.end());
          persist.sessions.insert(std::make_pair(
              sessionsDataItem.target_user_id, sessionDataBuffer));
        }
      }
    } catch (std::system_error &e) {
      error = e.what();
    }

    this->scheduleOrRun(cryptoThread, [&]() {
      std::string error;
      this->cryptoModule.reset(
          new crypto::CryptoModule(userId, storedSecretKey.value(), persist));
      if (persist.isEmpty()) {
        crypto::Persist newPersist =
            this->cryptoModule->storeAsB64(storedSecretKey.value());
        this->scheduleOrRun(databaseThread, [&]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().storeOlmPersistData(newPersist);
          } catch (std::system_error &e) {
            error = e.what();
          }
          if (result_handler) {
            result_handler(error);
          }
        });
      } else {
        this->cryptoModule->restoreFromB64(storedSecretKey.value(), persist);
        if (result_handler) {
          result_handler(error);
        }
      }
    });
  });
}

std::string CoreModuleInternal::getUserPublicKey() {
  return this->cryptoModule->getIdentityKeys();
}

std::string CoreModuleInternal::getUserOneTimeKeys() {
  return this->cryptoModule->getOneTimeKeys();
}

} // namespace comm
