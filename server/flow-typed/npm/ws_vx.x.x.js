// flow-typed signature: 87208ba8490f9a5383db629f8881cba3
// flow-typed version: <<STUB>>/ws_v^6.0.0/flow_v0.75.0

/**
 * This is an autogenerated libdef stub for:
 *
 *   'ws'
 *
 * Fill this stub out by replacing all the `any` types.
 *
 * Once filled out, we encourage you to share your work with the
 * community by sending a pull request to:
 * https://github.com/flowtype/flow-typed
 */

declare module 'ws' {
  declare module.exports: any;

  declare type WebSocket = {
    on: (name: string, func: Function) => void,
    send: (value: string) => void,
    close: (code?: number, reason?: string) => void,
    ping: () => void,
  };
}

/**
 * We include stubs for each file inside this npm package in case you need to
 * require those files directly. Feel free to delete any files that aren't
 * needed.
 */
declare module 'ws/browser' {
  declare module.exports: any;
}

declare module 'ws/lib/buffer-util' {
  declare module.exports: any;
}

declare module 'ws/lib/constants' {
  declare module.exports: any;
}

declare module 'ws/lib/event-target' {
  declare module.exports: any;
}

declare module 'ws/lib/extension' {
  declare module.exports: any;
}

declare module 'ws/lib/permessage-deflate' {
  declare module.exports: any;
}

declare module 'ws/lib/receiver' {
  declare module.exports: any;
}

declare module 'ws/lib/sender' {
  declare module.exports: any;
}

declare module 'ws/lib/validation' {
  declare module.exports: any;
}

declare module 'ws/lib/websocket-server' {
  declare module.exports: any;
}

declare module 'ws/lib/websocket' {
  declare module.exports: any;
}

// Filename aliases
declare module 'ws/browser.js' {
  declare module.exports: $Exports<'ws/browser'>;
}
declare module 'ws/index' {
  declare module.exports: $Exports<'ws'>;
}
declare module 'ws/index.js' {
  declare module.exports: $Exports<'ws'>;
}
declare module 'ws/lib/buffer-util.js' {
  declare module.exports: $Exports<'ws/lib/buffer-util'>;
}
declare module 'ws/lib/constants.js' {
  declare module.exports: $Exports<'ws/lib/constants'>;
}
declare module 'ws/lib/event-target.js' {
  declare module.exports: $Exports<'ws/lib/event-target'>;
}
declare module 'ws/lib/extension.js' {
  declare module.exports: $Exports<'ws/lib/extension'>;
}
declare module 'ws/lib/permessage-deflate.js' {
  declare module.exports: $Exports<'ws/lib/permessage-deflate'>;
}
declare module 'ws/lib/receiver.js' {
  declare module.exports: $Exports<'ws/lib/receiver'>;
}
declare module 'ws/lib/sender.js' {
  declare module.exports: $Exports<'ws/lib/sender'>;
}
declare module 'ws/lib/validation.js' {
  declare module.exports: $Exports<'ws/lib/validation'>;
}
declare module 'ws/lib/websocket-server.js' {
  declare module.exports: $Exports<'ws/lib/websocket-server'>;
}
declare module 'ws/lib/websocket.js' {
  declare module.exports: $Exports<'ws/lib/websocket'>;
}
