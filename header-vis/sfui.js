/**
 * Copyright (C) 2023 David Guler
 * @license ISC
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose
 * with or without fee is hereby granted, provided that the above copyright notice
 * and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED “AS IS” AND THE AUTHOR DISCLAIMS ALL
 * WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL
 * THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
 * CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING
 * FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF
 * CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _a, _Log_level;
// ----------------------------------------------
//            Maybe Type Definition
// ----------------------------------------------
const NOTHING = [undefined, "nothing"];
export function Nothing() {
    return NOTHING;
}
export function Just(value) {
    return [
        value,
        "just",
    ];
}
export function is_just(object) {
    return object[1] === "just";
}
export function is_nothing(object) {
    return object[1] === "nothing";
}
export function is_ok(result) {
    return result[1] === "ok";
}
export function is_err(result) {
    return result[1] === "err";
}
function Ok(value) {
    return [
        value,
        "ok"
    ];
}
function Err(value) {
    return [
        value,
        "err"
    ];
}
function is_no_component(comp) {
    return Array.isArray(comp) && comp.length === 0;
}
function is_function_component(comp) {
    return Array.isArray(comp) && is_function(comp[0]);
}
function is_sjdon(comp) {
    return Array.isArray(comp) &&
        (comp.length === 0 ||
            (is_function(comp[0]) || is_string(comp[0])));
}
const TEXT_TYPE = "#text";
function is_vnode_props(object) {
    return is_object(object) && !Array.isArray(object);
}
function is_element_node(node) {
    return "props" in node && "children" in node;
}
function is_text_node(node) {
    return (node === null || node === void 0 ? void 0 : node.type) === TEXT_TYPE && "children" in node;
}
function is_vnode(object) {
    return is_object(object) && "dom_element" in object;
}
export function element_node(dom_element) {
    var _b;
    return {
        type: ((_b = dom_element === null || dom_element === void 0 ? void 0 : dom_element.nodeName) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "",
        dom_element,
        props: {},
        children: []
    };
}
export function text_node(text) {
    return {
        type: TEXT_TYPE,
        children: text
    };
}
// ----------------------------------------------
//          Virtual DOM Implementation
// ----------------------------------------------
/**
 * Mounts the app into the DOM
 *
 * @param root_sjdon The SJDON to serve as the app's root
 * @param root_element The element whereupon to mount the app
 */
export function render(root_sjdon, root_element) {
    const root_node = build_vnode([...root_sjdon]);
    if (is_err(root_node)) {
        const [err] = root_node;
        Log.error(...err);
    }
    else if (is_just(root_node[0])) {
        const [[root]] = root_node;
        root.dom_element = root_element;
        register_hook("rerender", partial(update_components, root, root_sjdon));
        update_subtree(root, root, true);
        Log.info("App started");
    }
}
function update_components(root_node, root_sjdon) {
    const new_vdom = build_vnode([...root_sjdon]);
    if (is_err(new_vdom)) {
        Log.error(...new_vdom[0]);
    }
    else if (is_just(new_vdom[0])) {
        const [[new_root]] = new_vdom;
        if (!root_node)
            root_node = new_root;
        else
            compare_and_update_dom(root_node, new_root);
    }
}
/**
 * Recursively builds a Virtual Dom for the given SJDON
 *
 * @param sjdon The SJDON description of the DOM
 * @returns A VNode if the input was valid SJDON,
 *          Nothing if the SJDON was empty,
 *          an Error message if the input was invalid
 */
export function build_vnode(sjdon) {
    const node = element_node();
    // Resolve function components
    while (is_function_component(sjdon)) {
        const [props, children] = split_array(c => is_vnode_props(c), sjdon.slice(1));
        function collect_props(accumulator, current_prop) {
            return Object.assign(Object.assign({}, accumulator), current_prop);
        }
        const collected_props = props.reduce(collect_props, {});
        const maybeSjdon = sjdon[0](collected_props, ...children);
        if (is_sjdon(maybeSjdon)) {
            sjdon = maybeSjdon;
        }
        else {
            return Err(["Invalid SJDON", sjdon]);
        }
    }
    // Return Nothing if component should not be in DOM
    if (is_no_component(sjdon))
        return Ok(Nothing());
    // Resolve props and children
    if (!is_string(sjdon[0]))
        return Err(["Expected a string!"]);
    node.type = sjdon[0];
    let child_number = 1;
    for (let child of sjdon.slice(1)) {
        if (is_sjdon(child)) {
            const built = build_vnode(child);
            if (is_err(built)) {
                return built;
            }
            else if (is_just(built[0])) {
                const [[child_node]] = built;
                node.children.push(child_node);
            }
        }
        else if (is_string(child)) {
            node.children.push(text_node(child));
        }
        else if (is_vnode_props(child)) {
            assign_properties(node, child);
        }
        else if (is_undefined(child)) {
            return Err([
                `Child #${child_number} of`,
                sjdon,
                "is undefined! You might be missing a comma in your SJDON.\n",
                "If you wanted to remove the child from the dom, make it `[]` instead."
            ]);
        }
        child_number++;
    }
    return Ok(Just(node));
}
/**
 * Helper function assigning properties to to VNodes.
 *
 * @param destination The Node whose properties to modify
 * @param props The properties to assign to the destination
 */
function assign_properties(destination, props) {
    const new_props = Object.assign(Object.assign({}, destination.props), props);
    if ("attributes" in props) {
        new_props.attributes = Object.assign(Object.assign({}, destination.props.attributes), props.attributes);
    }
    if ("data" in props) {
        new_props.data = Object.assign(Object.assign({}, destination.props.data), props.data);
    }
    if ("style" in props) {
        if (Array.isArray(props.style))
            Object.assign(new_props.style, destination.props.style, ...props.style);
        else if (is_object(props.style))
            new_props.style = Object.assign(Object.assign({}, destination.props.style), props.style);
    }
    destination.props = new_props;
}
/**
 * Recursively compare the current and new VNodes and perform the minimal necessary updates
 * to the current node.
 * Note: The update modifies the current_node
 *
 * @param current_node The current node
 * @param new_node The new node to compare to
 */
function compare_and_update_dom(current_node, new_node) {
    const update_type = compare_vnodes(current_node, new_node);
    if (update_type === "UPDATE_SUBTREE") {
        update_subtree(current_node, new_node);
        return;
    }
    if (is_element_node(current_node) && is_element_node(new_node)) {
        if (update_type === "UPDATE_ATTR") {
            current_node.props = new_node.props;
            update_props(current_node);
        }
        if (Array.isArray(current_node.children)) {
            for (let i = 0; i < current_node.children.length; i++) {
                compare_and_update_dom(current_node.children[i], new_node.children[i]);
            }
        }
    }
}
/**
 * Updates the entire subtree starting from the provided node.
 *
 * @param node The previous node
 * @param new_node The new node
 */
function update_subtree(node, new_node, force_update = false) {
    var _b;
    if (!node.dom_element)
        return;
    if (is_element_node(node) && is_element_node(new_node)) {
        node.props = new_node.props || {};
    }
    node.type = new_node.type;
    // Replace the entire node if it's a text node or the type differs
    if (force_update || is_text_node(node) || is_text_node(new_node) || (((_b = node.dom_element.tagName) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== node.type)) {
        node.children = new_node.children;
        const new_dom_element = render_vnode(node);
        node.dom_element.replaceWith(new_dom_element);
        node.dom_element = new_dom_element;
        return;
    }
    // For minimal child updates
    // First, replace the existing children and remove those that disappeared
    let i = 0;
    for (; i < node.children.length; i++) {
        if (!new_node.children[i]) {
            node.children[i].dom_element.remove();
        }
        else {
            node.children[i] = update_existing_child(node.children[i], new_node.children[i]);
        }
    }
    // If children were removed, update the node.children accordingly
    if (new_node.children.length < node.children.length) {
        node.children = node.children.slice(0, new_node.children.length);
    }
    // Finally, append any added children
    for (; i < new_node.children.length; i++) {
        const current_child = new_node.children[i];
        if (is_vnode(current_child)) {
            node.children.push(current_child);
            node.children[i].dom_element = render_vnode(node.children[i]);
            node.dom_element.append(node.children[i].dom_element);
        }
    }
    update_props(node);
}
/**
 * Update the given child node.
 *
 * @see update_subtree
 * @param child The base child
 * @param new_child The new child node
 */
/*@__INLINE__*/
function update_existing_child(child, new_child) {
    const updateType = compare_vnodes(child, new_child);
    if (updateType === "UPDATE_SUBTREE") {
        new_child.dom_element = render_vnode(new_child);
        child.dom_element.replaceWith(new_child.dom_element);
        return new_child;
    }
    else if (updateType === "UPDATE_ATTR") {
        if (is_element_node(child) && is_element_node(new_child)) {
            child.props = new_child.props;
            update_props(child);
            return child;
        }
        else {
            Log.error("Tried to update attributes on TextNode");
        }
    }
    return child;
}
/*@__INLINE__ */
function update_props(node) {
    for (let attr in node.props) {
        set_prop_on_element(node.dom_element, attr, node.props[attr]);
    }
    //set_focus(node);
}
/**
 * Performs a lazy comparison between the two provided nodes.
 *
 * @param {VNode} node
 * @param {VNode} other
 * @returns The type of update required
 */
export function compare_vnodes(node, other) {
    if (node.type !== other.type)
        return "UPDATE_SUBTREE";
    if (is_text_node(node) && node.children !== other.children)
        return "UPDATE_SUBTREE";
    if (node.children.length !== other.children.length)
        return "UPDATE_SUBTREE";
    if (is_element_node(node) && is_element_node(other)) {
        if (Object.keys(node.props).length !== Object.keys(other.props).length)
            return "UPDATE_ATTR";
        for (let attr in other.props) {
            if (is_undefined(node.props[attr]) || node.props[attr] !== other.props[attr]) {
                return "UPDATE_ATTR";
            }
        }
    }
    return "UPDATE_NONE";
}
// ----------------------------------------------
//                DOM Operations
// ----------------------------------------------
/**
 * Creates a real DOM element from a VNode blueprint.
 * @param {VNode} node The node to render to a DOM element.
 * @returns The rendered DOM element
 */
function render_vnode(node) {
    if (is_text_node(node)) {
        return document.createTextNode(node.children);
    }
    else {
        const element = document.createElement(node.type);
        for (let attr in node.props) {
            set_prop_on_element(element, attr, node.props[attr]);
        }
        element.append(...node.children.map(c => c.dom_element = render_vnode(c)));
        return element;
    }
}
/**
 * Sets given property on a real DOM element.
 *
 * @param {HTMLElement} element
 * @param prop
 * @param value
 */
function set_prop_on_element(element, prop, value) {
    if (prop === "attributes") {
        for (let attr in value) {
            element.setAttribute(attr, value[attr]);
        }
    }
    else if (prop === "data") {
        Object.assign(element.dataset, value);
    }
    else if (prop === "style" && !is_string(value)) {
        if (Array.isArray(value))
            Object.assign(element.style, ...value);
        else
            Object.assign(element.style, value);
    }
    else {
        element[prop] = value;
    }
}
function set_focus(node) {
    // TODO: Actually track user focus
    if (node.props.autofocus) {
        node.dom_element.focus();
    }
}
;
/**
 * Creates a key-value store.
 *
 * @returns A function for accessing the key-value store
 */
export function create_store() {
    let data = {};
    return (key, ...value) => (value.length === 0)
        ? data[key]
        : (data[key] = value[0]);
}
const hooks = create_store();
/**
 * Register a callback to be executed on some event in the SFUI lifecycle
 *
 * @param event The event whereupon the callback should be executed
 * @param callback The callback to be executed
 */
export function register_hook(event, callback) {
    var _b;
    const all_hooks = (_b = hooks(event)) !== null && _b !== void 0 ? _b : [];
    hooks(event, [callback, ...all_hooks]);
}
const state = create_store();
/**
 * Provides access to an immutable state and an update function (reducer pattern).
 *
 * Note that the provided `initial_value` will be used whenever the state is
 * currently `null` or `undefined`, not just when the state is first created!
 *
 * @param {string|number} id the basis for the store access
 * @param {string|number} key for specialized store access
 * @param {T} initial_value The value to be returned if the state is undefined or null
 * @returns A "tuple", the first element being the state's current value, the second being an update function
 */
export function use_state(id, key, initial_value) {
    var _b;
    const store_id = `${id}@${key}`;
    const current_value = (_b = state(store_id)) !== null && _b !== void 0 ? _b : state(store_id, initial_value);
    function set_state(update) {
        var _b;
        state(store_id, update(state(store_id)));
        (_b = hooks("rerender")) === null || _b === void 0 ? void 0 : _b.forEach(callback => callback());
    }
    return [current_value, set_state];
}
// ----------------------------------------------
//            Handy Utility Functions
// ----------------------------------------------
/**
 * Partially applies a function.
 *
 * Applying a single argument to f(a,b) yields f'(b), where "a" is now a constant.
 *
 * Example:
 * ```
 * function f(a,b) { return a * b; }
 * const double = partial(f, 2);
 * // <=> function double(b) { return 2 * b; }
 *
 * console.log(double(42))       // 84
 * ```
 * @param fn The function to partially apply
 * @param args The arguments to apply to the function
 * @returns The function, with the given arguments already applied
 */
export function partial(fn, ...args) {
    return (...more_args) => fn(...args, ...more_args);
}
function is_undefined(object) {
    return typeof object === typeof undefined;
}
function is_object(object) {
    return typeof object === typeof {};
}
function is_string(object) {
    return typeof object === typeof "";
}
function is_function(object) {
    return typeof object === typeof Function;
}
/**
 * Splits an array on a predicate.
 * The result is an array of two arrays.
 * The first one containing all matching elments, the second containing all non-matching elements.
 *
 * @param predicate The predicate on which to split the array
 * @param subject The array to split
 * @returns A tuple of all matching and all non-matching elements
 */
function split_array(predicate, subject) {
    const match = [];
    const no_match = [];
    for (const element of subject) {
        if (predicate(element)) {
            match.push(element);
        }
        else {
            no_match.push(element);
        }
    }
    return [match, no_match];
}
// ----------------------------------------------
//                   Logging
// ----------------------------------------------
const _LogLevels = ["DEBUG", "INFO", "WARN", "ERROR"];
function is_log_level(object) {
    return _LogLevels.includes(object);
}
class Log {
    static get level() { return __classPrivateFieldGet(Log, _a, "f", _Log_level); }
    static set level(level) {
        if (is_log_level(level))
            __classPrivateFieldSet(Log, _a, level, "f", _Log_level);
        else
            console.warn(`[SFUI] Trying to set invalid LogLevel: '${level}'`);
    }
    static debug(...stuff) {
        Log.log(console.debug, ...stuff);
    }
    static info(...stuff) {
        Log.log(console.info, ...stuff);
    }
    static warn(...stuff) {
        Log.log(console.warn, ...stuff);
    }
    static error(...stuff) {
        Log.log(console.error, ...stuff);
    }
    static log(log_fn, ...stuff) {
        log_fn("[SFUI]", ...stuff);
    }
}
_a = Log;
_Log_level = { value: "INFO" };
export { Log };
