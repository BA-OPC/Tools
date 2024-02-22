import { parse } from "./parse.mjs"
import { is_undefined } from "./util.js"
import { render, use_state } from "../sfui.js"

const HeaderInput = () => {
    const [h_val, set_header] = use_state("header_input", 0, "");
    const [cur_pos, set_cur_pos] = use_state("cursor_pos", 0, "");

    const oninput = (e) => {
        e.preventDefault();
        set_header(() => e.target.value.replaceAll(" ", ""))
        if (e.data) {
            const plus = e.target.selectionStart % 3 === 0 ? 1 : 0;
            set_cur_pos(() => e.target.selectionStart + e.data.length + plus)
        } else if (e.inputType === "deleteContentBackward") {
            set_cur_pos(() => e.target.selectionStart)
        }
        return false;
    };
    const onselectionchange = (e) => {
        set_cur_pos(() => e.target.selectionStart)
    }

    return [ "input"
        , { type: "text"
          , value: render_input(h_val)
          , selectionStart: cur_pos
          , selectionEnd: cur_pos
          , oninput
          }
    ]
}

function render_input(str) {
    const parts = [];
    let i = 0
    for (; i < str.length; i += 2)
        parts.push(str.substring(i, i+2));


    return parts.join(" ");

}

const HeaderSection = ({key, title, className}, ...children) => {
    const [expanded, set_expanded] = use_state("section_expanded", key, true);
    return (
        [ "article", { className: `header-section ${expanded ? "expanded" : ""} ${className ?? ""}` }
        , [ "header", { onclick: () => set_expanded(() => !expanded) }
          , [ "h2", title ]
          , [ "div", { className: "expand-icon" } ]
          ]
        , [ "main", ...(children ?? []) ]
        ]
    );
}

const Visualize = () => {
    const [h_val] = use_state("header_input", 0, "");
    const val = h_val.replaceAll(" ", "")
    const output = [ "div", { className: "visualization" } ];

    const [msg, err] = parse(val); 
    //console.log("msg", msg);
    if (err) {
        output.push([ Error, { value: h_val, err } ]);
    }

    const h_general = [ HeaderSection, { key: 0, title: "NetworkMessage Header", className: "nwmsg-header" } ]
    if (msg.version_flags) {
        output.push(h_general);
        h_general.push([ VisHeaderVersionFlags, { value: msg.version_flags } ])
    }
    if (msg.ext_flags_1) {
        h_general.push([ VisExtFlags1, { value: msg.ext_flags_1 } ])
    }
    if (!is_undefined(msg.publisher_id)) {
        h_general.push([ VisPublisherId, { value: msg.publisher_id } ])
    }

    // Group
    const h_group = [ HeaderSection, { key: 1, title: "Group Header", className: "group-header" } ]
    if (msg.group_flags) {
        output.push(h_group);
        h_group.push([ VisGroupFlags, { value: msg.group_flags } ])
    }
    if (msg.group_flags?.writer_group_id && !is_undefined(msg.writer_group_id)) {
        h_group.push([ VisWriterGroupId, { value: msg.writer_group_id } ])
    }
    if (msg.group_flags?.group_version && !is_undefined(msg.group_version)) {
        h_group.push([ VisGroupVersion, { value: msg.group_version } ])
    }
    if (msg.group_flags?.network_message_number && !is_undefined(msg.network_message_number)) {
        h_group.push([ VisNwMsgNr, { value: msg.network_message_number } ])
    }
    if (msg.group_flags?.sequence_number && !is_undefined(msg.sequence_number)) {
        h_group.push([ VisSeqNr, { value: msg.sequence_number } ])
    }


    // Payload
    const h_payload = [ HeaderSection, { key: 2, title: "Payload Header", className: "payload-header" } ]
    if (msg.version_flags?.payload_header && msg.payload_message_count) {
        output.push(h_payload);
        h_payload.push([ VisPLMsgCount, { value: msg.payload_message_count } ])
    }
    if (msg.version_flags?.payload_header && msg.dataset_writer_ids) {
        h_payload.push([ VisDSWriterIds, { value: msg.dataset_writer_ids } ])
    }


    // Security
    const h_security = [ HeaderSection, { key: 3, title: "Security Header", className: "security-header" } ]
    if (msg.ext_flags_1?.security_header && msg.security_flags) {
        output.push(h_security);
        h_security.push([ VisSecurityFlags, { value: msg.security_flags } ])
    }
    if (msg.ext_flags_1?.security_header && msg.security_token_id) {
        h_security.push([ VisSecurityTokId, { value: msg.security_token_id } ])
    }
    if (msg.ext_flags_1?.security_header && !isNaN(msg.security_nonce_len)) {
        h_security.push([ VisSecurityNonce, { len: msg.security_nonce_len, content: msg.security_nonce } ])
    }

    const h_data = [ HeaderSection, { key: 4, title: "Payload", className: "payload" } ]
    if (msg.payload) {
        output.push(h_data);
        h_data.push([ VisPayload, { value: msg.payload } ])
    }


    return output;
}



/***************************/
/*      Visualization      */
/***************************/

const VisHeaderVersionFlags = ({value}) => {
    return (
        [ "section", { className: "nwmsg-header version-flags-header" }
        , [ "p"
          , [ "strong", "UADPVersion:" ]
          , [ "span", value.version.toString() ]
          ]
        , [ "p" , [ "strong", "UADPFlags:" ] ]
        , [ "ul"
          , [ "li"
              , [ "strong", "PublisherId:" ]
              , [ "span", value.publisher_id ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "GroupHeader:" ]
              , [ "span", value.group_header ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "PayloadHeader:" ]
              , [ "span", value.payload_header ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "ExtendedFlags1:" ]
              , [ "span", value.ext_flags_1 ? "enabled (1)" : "disabled (0)" ]
          ]
        ]
        ]
    );
};

const VisExtFlags1 = ({value}) => {
    return (
        [ "section", { className: "nwmsg-header ext-flags1-header" }
        , [ "p" , [ "strong", "ExtendedFlags1:" ] ]
        , [ "ul"
          , [ "li"
              , [ "strong", "PublisherIdLen:" ]
              , [ "span", `${value.publisher_id_len} Bytes` ]
          ]
          , [ "li"
              , [ "strong", "DataSetClassId:" ]
              , [ "span", value.dataset_class_id ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "Timestamp:" ]
              , [ "span", value.timestamp ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "PicoSeconds:" ]
              , [ "span", value.pico_seconds ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "ExtendedFlags2:" ]
              , [ "span", value.ext_flags_2 ? "enabled (1)" : "disabled (0)" ]
          ]
        ]
        ]
    );
};

const VisPublisherId = ({value}) => {
    return (
        [ "section", { className: "nwmsg-header publisher-id-header" }
        , [ "p"
          , [ "strong", "PublisherId:" ]
          , isNaN(value) ? [ "span", { className: "error-text" }, "Missing" ] : [ "span", value.toString() ]
          ]
        ]
    );
};


// Group header

const VisGroupFlags = ({value}) => {
    return (
        [ "section", { className: "group-header group-flags-header" }
        , [ "p" , [ "strong", "GroupFlags:" ] ]
        , [ "ul"
          , [ "li"
              , [ "strong", "WriterGroupId:" ]
              , [ "span", value.writer_group_id ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "GroupVersion:" ]
              , [ "span", value.group_version ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "NetworkMessageNumber:" ]
              , [ "span", value.network_message_number ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "SequenceNumber:" ]
              , [ "span", value.sequence_number ? "enabled (1)" : "disabled (0)" ]
          ]
        ]
        ]
    );
};

const VisWriterGroupId = ({value}) => {
    return (
        [ "section", { className: "group-header writer-group-id-header" }
        , [ "p"
          , [ "strong", "WriterGroupId:" ]
          , isNaN(value) ? [ "span", { className: "error-text" }, "Missing" ] : [ "span", value.toString() ]
          ]
        ]
    );
};
const VisGroupVersion = ({value}) => {
    return (
        [ "section", { className: "group-header group-version-header" }
        , [ "p"
          , [ "strong", "GroupVersion:" ]
          , isNaN(value) ? [ "span", { className: "error-text" }, "Missing" ] : [ "span", value.toString() ]
          ]
        ]
    );
};

const VisNwMsgNr = ({value}) => {
    return (
        [ "section", { className: "group-header nwmsgnr-header" }
        , [ "p"
          , [ "strong", "NetworkMessageNumber:" ]
          , isNaN(value) ? [ "span", { className: "error-text" }, "Missing" ] : [ "span", value.toString() ]
          ]
        ]
    );
};

const VisSeqNr = ({value}) => {
    return (
        [ "section", { className: "group-header seqnr-header" }
        , [ "p"
          , [ "strong", "SequenceNumber:" ]
          , isNaN(value) ? [ "span", { className: "error-text" }, "Missing" ] : [ "span", value.toString() ]
          ]
        ]
    );
};

// Payload Headers
const VisPLMsgCount = ({value}) => {
    return (
        [ "section", { className: "payload-header message-count-header" }
        , [ "p"
          , [ "strong", "MessageCount:" ]
          , isNaN(value) ? [ "span", { className: "error-text" }, "Missing" ] : [ "span", value.toString() ]
          ]
        ]
    );
};
const VisDSWriterIds = ({value}) => {
    return (
        [ "section", { className: "payload-header ds-writer-ids-header" }
        , [ "p"
          , [ "strong", "DatasetWriterIds:" ]
          , [ "span", `[ ${value.join(",")} ]` ]
          ]
        ]
    );
};


// Security Headers
const VisSecurityFlags = ({value}) => {
    return (
        [ "section", { className: "security-header security-flags-header" }
        , [ "p" , [ "strong", "SecurityFlags:" ] ]
        , [ "ul"
          , [ "li"
              , [ "strong", "NetworkMessage Signed:" ]
              , [ "span", value.nm_signed ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "NetworkMessage Encryption:" ]
              , [ "span", value.nm_encryption ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "SecurityFooter:" ]
              , [ "span", value.security_footer ? "enabled (1)" : "disabled (0)" ]
          ]
          , [ "li"
              , [ "strong", "Force key reset:" ]
              , [ "span", value.force_key_reset ? "enabled (1)" : "disabled (0)" ]
          ]
        ]
        ]
    );
};

const VisSecurityTokId = ({value}) => {
    return (
        [ "section", { className: "security-header security-id-header" }
        , [ "p"
          , [ "strong", "SecurityTokenId:" ]
          , isNaN(value) ? [ "span", { className: "error-text" }, "Missing" ] : [ "span", value.toString() ]
          ]
        ]
    );
};

const VisSecurityNonce = ({len, content}) => {
    return (
        [ "section", { className: "security-header security-nonce-header" }
        , [ "p"
          , [ "strong", "SecurityNonceLength:" ]
          , isNaN(len) ? [ "span", { className: "error-text" }, "Missing" ] : [ "span", len.toString() ]
          , ["br"]
          , [ "strong", "SecurityNonce[", len.toString(), "]:" ]
          , [ "span", render_input(content ?? "") ]
          ]
        ]
    );
};

const VisPayload = ({value}) =>
    [ "section"
    , [ "p"
      , [ "strong", "Sizes:" ]
      , value.sizes.map(s => s.toString()).join(", ")]
    , ...( value.messages.map(m => [VisDataSetMessage, {message: m}]) )
    ];

const VisDataSetMessage = ({message}) =>
    [ "div"
    , [ "section"
      , [ "p" , [ "strong", "DataSetFlags1:" ] ]
      , [ "ul"
        , [ "li"
            , [ "strong", "Is Valid:" ]
            , [ "span", message.flags_1.valid ? "valid (1)" : "invalid (0)" ]
        ]
        , [ "li"
            , [ "strong", "Field Encoding:" ]
            , [ "span", message.flags_1.field_encoding ]
        ]
        , [ "li"
            , [ "strong", "ConfigurationVersionMajorVersion:" ]
            , [ "span", message.configuration_major_version ? "enabled (1)" : "disabled (0)" ]
        ]
        , [ "li"
            , [ "strong", "ConfigurationVersionMinorVersion:" ]
            , [ "span", message.configuration_minor_version ? "enabled (1)" : "disabled (0)" ]
        ]
        , [ "li"
            , [ "strong", "DataSetFlags2:" ]
            , [ "span", message.flags_1.flags_2 ? "enabled (1)" : "disabled (0)" ]
          ]
        ]
      ]
        // TODO: visualize the other fields
    ];

const Error = ({value, err}) =>
    [ "section", {className: "error"}
    , [ "div"
      , [ "strong", "Error: "]
      , [ "span", {className: "error-text"}, err.message ]
      ]
    , [ "div"
      , [ "span", value.substring(0, err.position) ?? "" ]
      , [ "strong", value.substring(err.position, err.position + err.length) ?? "" ]
      , [ "span", value.substring(err.position + err.length) ?? "" ]
      ]
    ]




const App = () =>
    [ "div", {}
      , ["h1", "OPC UA PubSub NetworkMessage Inspector"]
      , [ HeaderInput ]
      , [ Visualize ]
    ];
render([App], document.getElementById("headers-app"));

