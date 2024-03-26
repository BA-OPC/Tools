import { render, use_state } from "../sfui.js";
import { HeaderInput, Visualize } from "./headers.js";
import { FileImport, PacketSidebar } from "./packet-sidebar.js";

const LoadingSplash = () => {
    const [is_loading] = use_state("is_loading", 0, false);
    return !is_loading ? [] : (
    [ "div", { className: "loading-splash-wrap" }
    , [ "div", { className: "loading-splash" }
      , [ "div", { className: "loading-splash-spinner" }, "֎" ]
      , [ "span", { className: "loading-splash-text" }, "Loading ..." ]
      ]
    ]);
}

const App = () =>
    [ "div", {}
    , [ "header", { className: "page-header"}
      , ["h1", "OPC UA PubSub NetworkMessage Inspector"]
      , [ "div", { className: "file-import-wrap" }
        , [ FileImport ]
        ]
      ]
    , [ "div", { className: "page" }
      , [ PacketSidebar ]
      , [ "main"
        , [ HeaderInput ]
        , [ Visualize ]
        ]
      ]
    , [ LoadingSplash ]
    ];


render([App], document.getElementById("headers-app"));



