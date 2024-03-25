import { use_state } from "../sfui.js";

export const FileImport =  () => {
    const [, set_packets] = use_state("packets", 0, [])
    const [, set_file_err] = use_state("file_err", 0, undefined)
    const [, set_loading] = use_state("is_loading", 0, false);

    const onchange = (e) => {
        if (e.target.files?.length > 0) {
            set_loading(() => true);
            e.target.files[0].text()
                .then(content => {
                    return JSON.parse(content).map(p => ({
                        time: p._source.layers.frame["frame.time"].split(".")[0],
                        data: p._source.layers.data["data.data"].replaceAll(":", "")
                    }));
                })
                .then(packets => {
                    set_packets(() => packets);
                    set_file_err(() => undefined);
                })
                .catch(err => {
                    console.warn(err);
                    set_file_err(() => "Could not load file! Make sure it only contains OPC UA PubSub Packets!");
                })
                .finally(() => {
                    set_loading(() => false);
                });
        }
    };

    return (
    [ "div", { className: "file-import" }
    , [ "label", { htmlFor: "input-file" }, "Import Packet Dissection (json)" ]
    , [ "input", {
        id: "input-file",
        type: "file",
        accept: ".json,application/json",
        onchange
      } ]
    ]
    );
}

const PacketSidebarList = ({collapsed, packets}) => {
    const PacketRadioSelect = (packet, i) =>
        [ "label", { htmlFor: `packet-${i}`}
        , [ "li", { }
          , [ "input", {type: "radio", name: "packet", id: `packet-${i}`, value: packet.data } ]
          , [ "span", `${i}` ]
          , (!collapsed ? [ "small", packet.time ] : [])
          ]
        ];

    return (
    [ "ul", { className: "packet-select" }
    , ...(packets.map(PacketRadioSelect))
    ]);
}

export const PacketSidebar = () => {
    const [packets] = use_state("packets", 0, []);
    const [collapsed, set_collapsed] = use_state("packet_sidebar_collapsed", 0, false);
    const [, set_header] = use_state("header_input", 0, "");
    if (packets.length === 0) return [];

    const toggle_sidebar = () => {
        set_collapsed(c => !c);
    }
    const onchange = (e) => {
        if (e.target.value) {
            set_header(() => e.target.value);
        }
    };
    return (
    [ "div", { className: "packet-sidebar"}
    , [ "button", { onclick: toggle_sidebar }, (collapsed ? "+" : "Collapse")]
    , [ "fieldset", { name: "packet", onchange }
      , [ PacketSidebarList, {collapsed, packets } ]
      ]
    ]);

}

