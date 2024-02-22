import {is_undefined} from "./util.js";

export function parse(str) {
    const result = {}
    let progress = 0;
    const err = (message, len = 2) => err_func(progress, message, len);
    let e = undefined;

    /**
     * Advances the parser.
     * Returns undefined on success, error object on failure for a neat trick:
     * if (e = advance(1)) return e;
     *
     * @returns undefined | Error
     */
    const advance = (n_chars) => {
        if (str.length === 0) {
            return err(`End of input reached! Expected ${n_chars} more characters.`, 0)
        }
        progress += n_chars;
        str = str.slice(n_chars);
    }

    if (str.length < 2) {
        return [result, err("Data too short.")];
    }

    result.version_flags = parse_header_version_flags(str.substring(0,2))
    if (e = advance(2)) return [result, e];

    if (result.version_flags?.ext_flags_1) {
        const [flags, ok] =  parse_ext_flags_1(str.substring(0,2))
        if (!ok) return [result, err("Invalid PublisherIdLength! Must be between 0x0 and 0x3.")];
        result.ext_flags_1 = flags;
        if (e = advance(2)) return [result, e];
    }

    if (result.version_flags?.publisher_id) {
        let publisher_id_len = 2 * (result.ext_flags_1?.publisher_id_len ?? 1);
        const [publisher_id, ok] = parse_le_number(str.substring(0, publisher_id_len))
        if (!isNaN(publisher_id) && !ok) return [result, err("Could not parse as PublisherId", publisher_id_len)];
        result.publisher_id = publisher_id;
        if (e = advance(publisher_id_len)) return [result, e];
    }

    // Group Header
    if (result.version_flags?.group_header) {
        const flags = parse_group_flags(str.substring(0, 2))
        result.group_flags = flags;
        if (e = advance(2)) return [result, e];

        if (result.group_flags?.writer_group_id) {
            const [wg_id, ok] = parse_le_number(str.substring(0, 4))
            if (!isNaN(wg_id) && !ok) return [result, err("Could not parse as WriterGroupId!", 4)];
            result.writer_group_id = wg_id;
            if (e = advance(4)) return [result, e];
        }
        if (result.group_flags?.group_version) {
            const [ver, ok] = parse_le_number(str.substring(0, 8))
            if (!isNaN(ver) && !ok) return [result, err("Could not parse as GroupVersion!", 8)];
            result.group_version = ver;
            if (e = advance(8)) return [result, e];
        }
        if (result.group_flags?.network_message_number) {
            const [nw_msg_nr, ok] = parse_le_number(str.substring(0, 4))
            if (!isNaN(nw_msg_nr) && !ok) return [result, err("Could not parse as NetworkMessageNumber!", 4)];
            result.network_message_number = nw_msg_nr;
            if (e = advance(4)) return [result, e];
        }
        if (result.group_flags?.sequence_number) {
            const [seq_nr, ok] = parse_le_number(str.substring(0, 4))
            if (!isNaN(seq_nr) && !ok) return [result, err("Could not parse as NetworkMessageNumber!", 4)];
            result.sequence_number = seq_nr;
            if (e = advance(4)) return [result, e];
        }
    }


    // Payload Header
    if (result.version_flags?.payload_header) {
        result.payload_message_count = parseInt(str.substring(0,2), 16)
        result.dataset_writer_ids = [];
        if (e = advance(2)) return [result, e];

        for (let i = 0; i < result.payload_message_count; i++) {
            const [id, ok] = parse_le_number(str.substring(0,4));
            if (!ok) {
                console.warn("invalid DataSetWriterId!", str.substring(0,4));
                return [result, err("Invalid DataSetWriterId", 4)]
            }
            result.dataset_writer_ids.push(id);
            if (e = advance(4)) return [result, e];
        }

    }
    // Security Header
    if (result.ext_flags_1?.security_header) {
        const flags = parse_security_flags(str.substring(0, 2))
        result.security_flags = flags;
        if (e = advance(2)) return [result, e];

        const [token_id, tok_ok] = parse_le_number(str.substring(0,8))
        if (!tok_ok) return [result, err("Could not parse as SecurityTokenId", 8)];
        result.security_token_id = token_id;
        if (e = advance(8)) return [result, e];

        result.security_nonce_len = parseInt(str.substring(0,2), 16)
        if (e = advance(2)) return [result, e];

        result.security_nonce = str.substring(0,result.security_nonce_len * 2)
        if (e = advance(result.security_nonce_len * 2)) return [result, e];
    }

    const [payload, payload_err] = parse_payload(result.payload_message_count, str.substring(0));
    if (!is_undefined(payload_err)) {
        result.payload = str
        return [result, {...payload_err, position: payload_err.position + progress}];
    }
    result.payload = payload;


    return [result, undefined];
}

function parse_header_version_flags(value) {
    const byte = parseInt(value, 16)

    return {
        version: byte & 0x0f,
        publisher_id: (byte & 0x10) !== 0,
        group_header: (byte & 0x20) !== 0,
        payload_header: (byte & 0x40) !== 0,
        ext_flags_1: (byte & 0x80) !== 0,
    };
}

function parse_ext_flags_1(value) {
    const byte = parseInt(value, 16)

    const pub_len_bits = byte & 0x07;
    let publisher_id_len;
    if (pub_len_bits === 0x0) {
        publisher_id_len = 1;
    } else if (pub_len_bits === 0x01) {
        publisher_id_len = 2;
    } else if (pub_len_bits === 0x02) {
        publisher_id_len = 4;
    } else if ((byte & 0x07) === 0x03) {
        publisher_id_len = 8;
    } else {
        return [ {}, false ]
    }

    const result = {
        publisher_id_len,
        dataset_class_id: (byte & 0x08) !== 0,
        security_header: (byte & 0x10) !== 0,
        timestamp: (byte & 0x20) !== 0,
        pico_seconds: (byte & 0x40) !== 0,
        ext_flags_2: (byte & 0x80) !== 0,
    };
    return [ result, true ];
}

function parse_group_flags(value) {
    const byte = parseInt(value, 16)

    return {
        writer_group_id: byte & 0x01 !== 0,
        group_version: (byte & 0x02) !== 0,
        network_message_number: (byte & 0x04) !== 0,
        sequence_number: (byte & 0x08) !== 0,
    };
}

function parse_security_flags(value) {
    const byte = parseInt(value, 16)

    return {
        nm_signed: byte & 0x01 !== 0,
        nm_encryption: (byte & 0x02) !== 0,
        security_footer: (byte & 0x04) !== 0,
        force_key_reset: (byte & 0x08) !== 0,
    };
}


/**
 * Parse the payload
 * @param {number} n_dataset_messages
 * @param {string} value
 */
function parse_payload(n_dataset_messages, value) {
    const result = {
        sizes: [],
        messages: [],
    }
    let progress = 0;
    const err = (message, len = 2) => err_func(progress, message, len);
    let e = undefined;

    const advance = (n_chars) => {
        if (value.length === 0) {
            return err(`End of input reached! Expected ${n_chars} more characters.`, 0)
        }
        progress += n_chars;
        value = value.slice(n_chars);
    }

    // https://reference.opcfoundation.org/Core/Part14/v105/docs/7.2.4.5.3
    // [The "Sizes"] field shall be omitted if count is one or if bit 6 of the UADPFlags is false.
    if (n_dataset_messages > 1) {
        // parse sizes
        for (let i = 0; i < n_dataset_messages; i++) {
            const [size, ok] = parse_le_number(value.substring(0, 4));
            if (!ok) return err(`Could not parse LE number '${value.substring(0,4)}'`);
            if (e = advance(4)) return [result, e, progress];
            result.sizes.push(size);
        }
        const total_size = result.sizes.reduce((acc, s) => acc+s, 0);
        if ((value.length / 2) < total_size) {
            return [result, err(`Expected ${total_size} bytes of DataSetMessages but remaining input is only ${value.length/2} bytes!`), progress];
        }
    }

    if (result.sizes.length > 0) {
        // parse messages
        for (const size of result.sizes) {
            const len = size*2;
            const [msg, err] = parse_dataset_message(value.substring(0, len));
            if (!is_undefined(err)) return [result, {...err, position: err.position + progress}, progress];
            result.messages.push(msg);

            if (e = advance(len)) return [result, e, progress];
        }
    } else {
        const [msg, err, chars_consumed] = parse_dataset_message(value.substring(0));
        if (!is_undefined(err)) return [result, {...err, position: err.position + progress}, progress];
        result.messages.push(msg);

        if (e = advance(chars_consumed)) return [result, e, progress];
    }

    return [result, undefined, progress];
}

function parse_dataset_message(str) {
    const result = {};
    let progress = 0;
    const err = (message, len = 2) => err_func(progress, message, len);
    let e = undefined;

    const advance = (n_chars) => {
        if (str.length === 0) {
            return err(`End of input reached! Expected ${n_chars} more characters.`, 0)
        }
        progress += n_chars;
        str = str.slice(n_chars);
    }

    result.flags_1 = parse_dataset_flags_1(str.substring(0,2));
    if(e = advance(2)) return [result, e, progress];

    if (result.flags_1.flags_2) {
        result.flags_2 = parse_dataset_flags_2(str.substring(0,2));
        if(e = advance(2)) return [result, e, progress];
    }
    if (result.flags_1.sequence_number) {
        const [n, ok] = parse_le_number(str.substring(0,4));
        if (!ok) return [result, err("Could not parse as DataSetMessageSequenceNumber", 4), progress];
        result.sequence_number = n
        if(e = advance(4)) return [result, e, progress];
    }
    if (result.flags_2?.timestamp) {
        const [n, ok] = parse_le_number(str.substring(0,16));
        if (!ok) return [result, err("Could not parse as Timestamp", 16), progress];
        result.timestamp = new Date(n);
        if(e = advance(16)) return [result, e, progress];

        if (result.flags_2?.pico_seconds) {
            const [n, ok] = parse_le_number(str.substring(0,4));
            if (!ok) return [result, err("Could not parse as PicoSeconds", 4), progress];
            result.pico_seconds = n;
            if(e = advance(4)) return [result, e, progress];
        }
    }
    if (result.flags_1.status) {
        const [status, ok] = parse_le_number(str.substring(0,4));
        if (!ok) return [result, err("Could not parse as Status", 4), progress];
        result.status = status;
        if(e = advance(4)) return [result, e, progress];
    }
    if (result.flags_1.configuration_major_version) {
        const [version, ok] = parse_le_number(str.substring(0,8));
        if (!ok) return [result, err("Could not parse as ConfigurationVersionMajorVersion", 8), progress];
        result.configuration_major_version = version;
        if(e = advance(8)) return [result, e, progress];
    }
    if (result.flags_1.configuration_minor_version) {
        const [version, ok] = parse_le_number(str.substring(0,8));
        if (!ok) return [result, err("Could not parse as ConfigurationVersionMajorVersion", 8), progress];
        result.configuration_minor_version = version;
        if(e = advance(8)) return [result, e, progress];
    }

    result.message_data = str.substring(0);

    return [result, undefined, progress];
}

function parse_dataset_flags_1(value) {
    const byte = parseInt(value, 16)

    let field_encoding = "Variant";
    switch((byte >> 1) & 0x3) {
        case 0x0:
            field_encoding = "Variant";
            break;
        case 0x1:
            field_encoding = "RawData";
            break;
        case 0x2:
            field_encoding = "DataValue";
            break;
        case 0x3:
            field_encoding = "!Reserved";
            break;
    }

    return {
        valid: is_bit_set(byte, 0),
        field_encoding,
        sequence_number: is_bit_set(byte, 3),
        status: is_bit_set(byte, 4),
        configuration_major_version: is_bit_set(byte, 5),
        configuration_minor_version: is_bit_set(byte, 6),
        flags_2: is_bit_set(byte, 7),
    };
}

function parse_dataset_flags_2(value) {
    const byte = parseInt(value, 16)

    let type = "!Reserved";
    switch(byte & ((1<<3)-1)) {
        case 0x0:
            type = "Data Key Frame";
            break;
        case 0x1:
            type = "Data Delta Frame";
            break;
        case 0x2:
            type = "Event";
            break;
        case 0x3:
            type = "Keep Alive";
            break;
    }

    return {
        type,
        timestamp: is_bit_set(byte, 4),
        pico_seconds: is_bit_set(byte, 5),
    };
}

/**
 * Check if the specified bit is set (if value was a binary integer value)
 *
 * @param {Int} value
 * @param {Int} bit
 * @returns boolean
 */
function is_bit_set(value, bit) {
    return (value & (1 << bit)) !== 0
}

/**
 * Parse a little endian hex value to a number
 * @param {string} value the hex value
 *
 * @returns [number, bool]
 */
function parse_le_number(value) {
    if (value.length % 2 !== 0) return [0, false];

    const be_num = [];
    while (value.length) {
        be_num.unshift(value.substring(0, 2));
        value = value.slice(2);
    }

    const result = parseInt(be_num.join(""), 16);

    return [result, !isNaN(result)];
}


const err_func = (position, message, length = 2) => ({ position, message, length });

