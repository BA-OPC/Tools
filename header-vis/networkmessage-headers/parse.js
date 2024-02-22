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

    result.payload = str


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

