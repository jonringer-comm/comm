#include <cstdarg>
#include <cstdint>
#include <cstdlib>
#include <new>
#include <ostream>

enum class OpaqueStatus {
  Ok = 0,
  Err = 1,
};

struct MessageState {
  char *message;
  char *state;
};

struct MessageSession {
  char *message;
  char *session;
};

extern "C" {

OpaqueStatus
client_register_c(const char *password, MessageState *message_state);

OpaqueStatus client_register_finish_c(
    const char *client_register_state,
    const char *server_message,
    char *new_message_buffer);

OpaqueStatus client_login_c(const char *password, MessageState *message_state);

OpaqueStatus client_login_finish_c(
    const char *client_login_state,
    const char *server_message,
    MessageSession *message_session);

} // extern "C"
