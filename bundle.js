var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var highlight = createCommonjsModule(function (module, exports) {
    /*
    Syntax highlighting with language autodetection.
    https://highlightjs.org/
    */

    (function(factory) {

      // Find the global object for export to both the browser and web workers.
      var globalObject = typeof window === 'object' && window ||
                         typeof self === 'object' && self;

      // Setup highlight.js for different environments. First is Node.js or
      // CommonJS.
      // `nodeType` is checked to ensure that `exports` is not a HTML element.
      if( !exports.nodeType) {
        factory(exports);
      } else if(globalObject) {
        // Export hljs globally even when using AMD for cases when this script
        // is loaded with others that may still expect a global hljs.
        globalObject.hljs = factory({});
      }

    }(function(hljs) {
      // Convenience variables for build-in objects
      var ArrayProto = [],
          objectKeys = Object.keys;

      // Global internal variables used within the highlight.js library.
      var languages = {},
          aliases   = {};

      // safe/production mode - swallows more errors, tries to keep running
      // even if a single syntax or parse hits a fatal error
      var SAFE_MODE = true;

      // Regular expressions used throughout the highlight.js library.
      var noHighlightRe    = /^(no-?highlight|plain|text)$/i,
          languagePrefixRe = /\blang(?:uage)?-([\w-]+)\b/i,
          fixMarkupRe      = /((^(<[^>]+>|\t|)+|(?:\n)))/gm;

      var spanEndTag = '</span>';
      var LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";

      // Global options used when within external APIs. This is modified when
      // calling the `hljs.configure` function.
      var options = {
        classPrefix: 'hljs-',
        tabReplace: null,
        useBR: false,
        languages: undefined
      };

      // keywords that should have no default relevance value
      var COMMON_KEYWORDS = 'of and for in not or if then'.split(' ');


      /* Utility functions */

      function escape(value) {
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      function tag(node) {
        return node.nodeName.toLowerCase();
      }

      function testRe(re, lexeme) {
        var match = re && re.exec(lexeme);
        return match && match.index === 0;
      }

      function isNotHighlighted(language) {
        return noHighlightRe.test(language);
      }

      function blockLanguage(block) {
        var i, match, length, _class;
        var classes = block.className + ' ';

        classes += block.parentNode ? block.parentNode.className : '';

        // language-* takes precedence over non-prefixed class names.
        match = languagePrefixRe.exec(classes);
        if (match) {
          var language = getLanguage(match[1]);
          if (!language) {
            console.warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
            console.warn("Falling back to no-highlight mode for this block.", block);
          }
          return language ? match[1] : 'no-highlight';
        }

        classes = classes.split(/\s+/);

        for (i = 0, length = classes.length; i < length; i++) {
          _class = classes[i];

          if (isNotHighlighted(_class) || getLanguage(_class)) {
            return _class;
          }
        }
      }

      /**
       * performs a shallow merge of multiple objects into one
       *
       * @arguments list of objects with properties to merge
       * @returns a single new object
       */
      function inherit(parent) {  // inherit(parent, override_obj, override_obj, ...)
        var key;
        var result = {};
        var objects = Array.prototype.slice.call(arguments, 1);

        for (key in parent)
          result[key] = parent[key];
        objects.forEach(function(obj) {
          for (key in obj)
            result[key] = obj[key];
        });
        return result;
      }

      /* Stream merging */

      function nodeStream(node) {
        var result = [];
        (function _nodeStream(node, offset) {
          for (var child = node.firstChild; child; child = child.nextSibling) {
            if (child.nodeType === 3)
              offset += child.nodeValue.length;
            else if (child.nodeType === 1) {
              result.push({
                event: 'start',
                offset: offset,
                node: child
              });
              offset = _nodeStream(child, offset);
              // Prevent void elements from having an end tag that would actually
              // double them in the output. There are more void elements in HTML
              // but we list only those realistically expected in code display.
              if (!tag(child).match(/br|hr|img|input/)) {
                result.push({
                  event: 'stop',
                  offset: offset,
                  node: child
                });
              }
            }
          }
          return offset;
        })(node, 0);
        return result;
      }

      function mergeStreams(original, highlighted, value) {
        var processed = 0;
        var result = '';
        var nodeStack = [];

        function selectStream() {
          if (!original.length || !highlighted.length) {
            return original.length ? original : highlighted;
          }
          if (original[0].offset !== highlighted[0].offset) {
            return (original[0].offset < highlighted[0].offset) ? original : highlighted;
          }

          /*
          To avoid starting the stream just before it should stop the order is
          ensured that original always starts first and closes last:

          if (event1 == 'start' && event2 == 'start')
            return original;
          if (event1 == 'start' && event2 == 'stop')
            return highlighted;
          if (event1 == 'stop' && event2 == 'start')
            return original;
          if (event1 == 'stop' && event2 == 'stop')
            return highlighted;

          ... which is collapsed to:
          */
          return highlighted[0].event === 'start' ? original : highlighted;
        }

        function open(node) {
          function attr_str(a) {
            return ' ' + a.nodeName + '="' + escape(a.value).replace(/"/g, '&quot;') + '"';
          }
          result += '<' + tag(node) + ArrayProto.map.call(node.attributes, attr_str).join('') + '>';
        }

        function close(node) {
          result += '</' + tag(node) + '>';
        }

        function render(event) {
          (event.event === 'start' ? open : close)(event.node);
        }

        while (original.length || highlighted.length) {
          var stream = selectStream();
          result += escape(value.substring(processed, stream[0].offset));
          processed = stream[0].offset;
          if (stream === original) {
            /*
            On any opening or closing tag of the original markup we first close
            the entire highlighted node stack, then render the original tag along
            with all the following original tags at the same offset and then
            reopen all the tags on the highlighted stack.
            */
            nodeStack.reverse().forEach(close);
            do {
              render(stream.splice(0, 1)[0]);
              stream = selectStream();
            } while (stream === original && stream.length && stream[0].offset === processed);
            nodeStack.reverse().forEach(open);
          } else {
            if (stream[0].event === 'start') {
              nodeStack.push(stream[0].node);
            } else {
              nodeStack.pop();
            }
            render(stream.splice(0, 1)[0]);
          }
        }
        return result + escape(value.substr(processed));
      }

      /* Initialization */

      function dependencyOnParent(mode) {
        if (!mode) return false;

        return mode.endsWithParent || dependencyOnParent(mode.starts);
      }

      function expand_or_clone_mode(mode) {
        if (mode.variants && !mode.cached_variants) {
          mode.cached_variants = mode.variants.map(function(variant) {
            return inherit(mode, {variants: null}, variant);
          });
        }

        // EXPAND
        // if we have variants then essentially "replace" the mode with the variants
        // this happens in compileMode, where this function is called from
        if (mode.cached_variants)
          return mode.cached_variants;

        // CLONE
        // if we have dependencies on parents then we need a unique
        // instance of ourselves, so we can be reused with many
        // different parents without issue
        if (dependencyOnParent(mode))
          return [inherit(mode, { starts: mode.starts ? inherit(mode.starts) : null })];

        if (Object.isFrozen(mode))
          return [inherit(mode)];

        // no special dependency issues, just return ourselves
        return [mode];
      }

      function compileKeywords(rawKeywords, case_insensitive) {
          var compiled_keywords = {};

          if (typeof rawKeywords === 'string') { // string
            splitAndCompile('keyword', rawKeywords);
          } else {
            objectKeys(rawKeywords).forEach(function (className) {
              splitAndCompile(className, rawKeywords[className]);
            });
          }
        return compiled_keywords;

        // ---

        function splitAndCompile(className, str) {
          if (case_insensitive) {
            str = str.toLowerCase();
          }
          str.split(' ').forEach(function(keyword) {
            var pair = keyword.split('|');
            compiled_keywords[pair[0]] = [className, scoreForKeyword(pair[0], pair[1])];
          });
        }
      }

      function scoreForKeyword(keyword, providedScore) {
        // manual scores always win over common keywords
        // so you can force a score of 1 if you really insist
        if (providedScore)
          return Number(providedScore);

        return commonKeyword(keyword) ? 0 : 1;
      }

      function commonKeyword(word) {
        return COMMON_KEYWORDS.indexOf(word.toLowerCase()) != -1;
      }

      function compileLanguage(language) {

        function reStr(re) {
            return (re && re.source) || re;
        }

        function langRe(value, global) {
          return new RegExp(
            reStr(value),
            'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
          );
        }

        function reCountMatchGroups(re) {
          return (new RegExp(re.toString() + '|')).exec('').length - 1;
        }

        // joinRe logically computes regexps.join(separator), but fixes the
        // backreferences so they continue to match.
        // it also places each individual regular expression into it's own
        // match group, keeping track of the sequencing of those match groups
        // is currently an exercise for the caller. :-)
        function joinRe(regexps, separator) {
          // backreferenceRe matches an open parenthesis or backreference. To avoid
          // an incorrect parse, it additionally matches the following:
          // - [...] elements, where the meaning of parentheses and escapes change
          // - other escape sequences, so we do not misparse escape sequences as
          //   interesting elements
          // - non-matching or lookahead parentheses, which do not capture. These
          //   follow the '(' with a '?'.
          var backreferenceRe = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
          var numCaptures = 0;
          var ret = '';
          for (var i = 0; i < regexps.length; i++) {
            numCaptures += 1;
            var offset = numCaptures;
            var re = reStr(regexps[i]);
            if (i > 0) {
              ret += separator;
            }
            ret += "(";
            while (re.length > 0) {
              var match = backreferenceRe.exec(re);
              if (match == null) {
                ret += re;
                break;
              }
              ret += re.substring(0, match.index);
              re = re.substring(match.index + match[0].length);
              if (match[0][0] == '\\' && match[1]) {
                // Adjust the backreference.
                ret += '\\' + String(Number(match[1]) + offset);
              } else {
                ret += match[0];
                if (match[0] == '(') {
                  numCaptures++;
                }
              }
            }
            ret += ")";
          }
          return ret;
        }

        function buildModeRegex(mode) {

          var matchIndexes = {};
          var matcherRe;
          var regexes = [];
          var matcher = {};
          var matchAt = 1;

          function addRule(rule, regex) {
            matchIndexes[matchAt] = rule;
            regexes.push([rule, regex]);
            matchAt += reCountMatchGroups(regex) + 1;
          }

          var term;
          for (var i=0; i < mode.contains.length; i++) {
            var re;
            term = mode.contains[i];
            if (term.beginKeywords) {
              re = '\\.?(?:' + term.begin + ')\\.?';
            } else {
              re = term.begin;
            }
            addRule(term, re);
          }
          if (mode.terminator_end)
            addRule("end", mode.terminator_end);
          if (mode.illegal)
            addRule("illegal", mode.illegal);

          var terminators = regexes.map(function(el) { return el[1]; });
          matcherRe = langRe(joinRe(terminators, '|'), true);

          matcher.lastIndex = 0;
          matcher.exec = function(s) {
            var rule;

            if( regexes.length === 0) return null;

            matcherRe.lastIndex = matcher.lastIndex;
            var match = matcherRe.exec(s);
            if (!match) { return null; }

            for(var i = 0; i<match.length; i++) {
              if (match[i] != undefined && matchIndexes["" +i] != undefined ) {
                rule = matchIndexes[""+i];
                break;
              }
            }

            // illegal or end match
            if (typeof rule === "string") {
              match.type = rule;
              match.extra = [mode.illegal, mode.terminator_end];
            } else {
              match.type = "begin";
              match.rule = rule;
            }
            return match;
          };

          return matcher;
        }

        function compileMode(mode, parent) {
          if (mode.compiled)
            return;
          mode.compiled = true;

          mode.keywords = mode.keywords || mode.beginKeywords;
          if (mode.keywords)
            mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);

          mode.lexemesRe = langRe(mode.lexemes || /\w+/, true);

          if (parent) {
            if (mode.beginKeywords) {
              mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')\\b';
            }
            if (!mode.begin)
              mode.begin = /\B|\b/;
            mode.beginRe = langRe(mode.begin);
            if (mode.endSameAsBegin)
              mode.end = mode.begin;
            if (!mode.end && !mode.endsWithParent)
              mode.end = /\B|\b/;
            if (mode.end)
              mode.endRe = langRe(mode.end);
            mode.terminator_end = reStr(mode.end) || '';
            if (mode.endsWithParent && parent.terminator_end)
              mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
          }
          if (mode.illegal)
            mode.illegalRe = langRe(mode.illegal);
          if (mode.relevance == null)
            mode.relevance = 1;
          if (!mode.contains) {
            mode.contains = [];
          }
          mode.contains = Array.prototype.concat.apply([], mode.contains.map(function(c) {
            return expand_or_clone_mode(c === 'self' ? mode : c);
          }));
          mode.contains.forEach(function(c) {compileMode(c, mode);});

          if (mode.starts) {
            compileMode(mode.starts, parent);
          }

          mode.terminators = buildModeRegex(mode);
        }

        // self is not valid at the top-level
        if (language.contains && language.contains.indexOf('self') != -1) {
          if (!SAFE_MODE) {
            throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.")
          } else {
            // silently remove the broken rule (effectively ignoring it), this has historically
            // been the behavior in the past, so this removal preserves compatibility with broken
            // grammars when running in Safe Mode
            language.contains = language.contains.filter(function(mode) { return mode != 'self'; });
          }
        }
        compileMode(language);
      }

      /*
      Core highlighting function. Accepts a language name, or an alias, and a
      string with the code to highlight. Returns an object with the following
      properties:

      - relevance (int)
      - value (an HTML string with highlighting markup)

      */
      function highlight(name, value, ignore_illegals, continuation) {

        function escapeRe(value) {
          return new RegExp(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
        }

        function endOfMode(mode, lexeme) {
          if (testRe(mode.endRe, lexeme)) {
            while (mode.endsParent && mode.parent) {
              mode = mode.parent;
            }
            return mode;
          }
          if (mode.endsWithParent) {
            return endOfMode(mode.parent, lexeme);
          }
        }

        function keywordMatch(mode, match) {
          var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
          return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
        }

        function buildSpan(className, insideSpan, leaveOpen, noPrefix) {
          if (!leaveOpen && insideSpan === '') return '';
          if (!className) return insideSpan;

          var classPrefix = noPrefix ? '' : options.classPrefix,
              openSpan    = '<span class="' + classPrefix,
              closeSpan   = leaveOpen ? '' : spanEndTag;

          openSpan += className + '">';

          return openSpan + insideSpan + closeSpan;
        }

        function processKeywords() {
          var keyword_match, last_index, match, result;

          if (!top.keywords)
            return escape(mode_buffer);

          result = '';
          last_index = 0;
          top.lexemesRe.lastIndex = 0;
          match = top.lexemesRe.exec(mode_buffer);

          while (match) {
            result += escape(mode_buffer.substring(last_index, match.index));
            keyword_match = keywordMatch(top, match);
            if (keyword_match) {
              relevance += keyword_match[1];
              result += buildSpan(keyword_match[0], escape(match[0]));
            } else {
              result += escape(match[0]);
            }
            last_index = top.lexemesRe.lastIndex;
            match = top.lexemesRe.exec(mode_buffer);
          }
          return result + escape(mode_buffer.substr(last_index));
        }

        function processSubLanguage() {
          var explicit = typeof top.subLanguage === 'string';
          if (explicit && !languages[top.subLanguage]) {
            return escape(mode_buffer);
          }

          var result = explicit ?
                       highlight(top.subLanguage, mode_buffer, true, continuations[top.subLanguage]) :
                       highlightAuto(mode_buffer, top.subLanguage.length ? top.subLanguage : undefined);

          // Counting embedded language score towards the host language may be disabled
          // with zeroing the containing mode relevance. Use case in point is Markdown that
          // allows XML everywhere and makes every XML snippet to have a much larger Markdown
          // score.
          if (top.relevance > 0) {
            relevance += result.relevance;
          }
          if (explicit) {
            continuations[top.subLanguage] = result.top;
          }
          return buildSpan(result.language, result.value, false, true);
        }

        function processBuffer() {
          result += (top.subLanguage != null ? processSubLanguage() : processKeywords());
          mode_buffer = '';
        }

        function startNewMode(mode) {
          result += mode.className? buildSpan(mode.className, '', true): '';
          top = Object.create(mode, {parent: {value: top}});
        }


        function doBeginMatch(match) {
          var lexeme = match[0];
          var new_mode = match.rule;

          if (new_mode && new_mode.endSameAsBegin) {
            new_mode.endRe = escapeRe( lexeme );
          }

          if (new_mode.skip) {
            mode_buffer += lexeme;
          } else {
            if (new_mode.excludeBegin) {
              mode_buffer += lexeme;
            }
            processBuffer();
            if (!new_mode.returnBegin && !new_mode.excludeBegin) {
              mode_buffer = lexeme;
            }
          }
          startNewMode(new_mode);
          return new_mode.returnBegin ? 0 : lexeme.length;
        }

        function doEndMatch(match) {
          var lexeme = match[0];
          var matchPlusRemainder = value.substr(match.index);
          var end_mode = endOfMode(top, matchPlusRemainder);
          if (!end_mode) { return; }

          var origin = top;
          if (origin.skip) {
            mode_buffer += lexeme;
          } else {
            if (!(origin.returnEnd || origin.excludeEnd)) {
              mode_buffer += lexeme;
            }
            processBuffer();
            if (origin.excludeEnd) {
              mode_buffer = lexeme;
            }
          }
          do {
            if (top.className) {
              result += spanEndTag;
            }
            if (!top.skip && !top.subLanguage) {
              relevance += top.relevance;
            }
            top = top.parent;
          } while (top !== end_mode.parent);
          if (end_mode.starts) {
            if (end_mode.endSameAsBegin) {
              end_mode.starts.endRe = end_mode.endRe;
            }
            startNewMode(end_mode.starts);
          }
          return origin.returnEnd ? 0 : lexeme.length;
        }

        var lastMatch = {};
        function processLexeme(text_before_match, match) {

          var lexeme = match && match[0];

          // add non-matched text to the current mode buffer
          mode_buffer += text_before_match;

          if (lexeme == null) {
            processBuffer();
            return 0;
          }

          // we've found a 0 width match and we're stuck, so we need to advance
          // this happens when we have badly behaved rules that have optional matchers to the degree that
          // sometimes they can end up matching nothing at all
          // Ref: https://github.com/highlightjs/highlight.js/issues/2140
          if (lastMatch.type=="begin" && match.type=="end" && lastMatch.index == match.index && lexeme === "") {
            // spit the "skipped" character that our regex choked on back into the output sequence
            mode_buffer += value.slice(match.index, match.index + 1);
            return 1;
          }
          lastMatch = match;

          if (match.type==="begin") {
            return doBeginMatch(match);
          } else if (match.type==="illegal" && !ignore_illegals) {
            // illegal match, we do not continue processing
            throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.className || '<unnamed>') + '"');
          } else if (match.type==="end") {
            var processed = doEndMatch(match);
            if (processed != undefined)
              return processed;
          }

          /*
          Why might be find ourselves here?  Only one occasion now.  An end match that was
          triggered but could not be completed.  When might this happen?  When an `endSameasBegin`
          rule sets the end rule to a specific match.  Since the overall mode termination rule that's
          being used to scan the text isn't recompiled that means that any match that LOOKS like
          the end (but is not, because it is not an exact match to the beginning) will
          end up here.  A definite end match, but when `doEndMatch` tries to "reapply"
          the end rule and fails to match, we wind up here, and just silently ignore the end.

          This causes no real harm other than stopping a few times too many.
          */

          mode_buffer += lexeme;
          return lexeme.length;
        }

        var language = getLanguage(name);
        if (!language) {
          console.error(LANGUAGE_NOT_FOUND.replace("{}", name));
          throw new Error('Unknown language: "' + name + '"');
        }

        compileLanguage(language);
        var top = continuation || language;
        var continuations = {}; // keep continuations for sub-languages
        var result = '', current;
        for(current = top; current !== language; current = current.parent) {
          if (current.className) {
            result = buildSpan(current.className, '', true) + result;
          }
        }
        var mode_buffer = '';
        var relevance = 0;
        try {
          var match, count, index = 0;
          while (true) {
            top.terminators.lastIndex = index;
            match = top.terminators.exec(value);
            if (!match)
              break;
            count = processLexeme(value.substring(index, match.index), match);
            index = match.index + count;
          }
          processLexeme(value.substr(index));
          for(current = top; current.parent; current = current.parent) { // close dangling modes
            if (current.className) {
              result += spanEndTag;
            }
          }
          return {
            relevance: relevance,
            value: result,
            illegal:false,
            language: name,
            top: top
          };
        } catch (err) {
          if (err.message && err.message.indexOf('Illegal') !== -1) {
            return {
              illegal: true,
              relevance: 0,
              value: escape(value)
            };
          } else if (SAFE_MODE) {
            return {
              relevance: 0,
              value: escape(value),
              language: name,
              top: top,
              errorRaised: err
            };
          } else {
            throw err;
          }
        }
      }

      /*
      Highlighting with language detection. Accepts a string with the code to
      highlight. Returns an object with the following properties:

      - language (detected language)
      - relevance (int)
      - value (an HTML string with highlighting markup)
      - second_best (object with the same structure for second-best heuristically
        detected language, may be absent)

      */
      function highlightAuto(text, languageSubset) {
        languageSubset = languageSubset || options.languages || objectKeys(languages);
        var result = {
          relevance: 0,
          value: escape(text)
        };
        var second_best = result;
        languageSubset.filter(getLanguage).filter(autoDetection).forEach(function(name) {
          var current = highlight(name, text, false);
          current.language = name;
          if (current.relevance > second_best.relevance) {
            second_best = current;
          }
          if (current.relevance > result.relevance) {
            second_best = result;
            result = current;
          }
        });
        if (second_best.language) {
          result.second_best = second_best;
        }
        return result;
      }

      /*
      Post-processing of the highlighted markup:

      - replace TABs with something more useful
      - replace real line-breaks with '<br>' for non-pre containers

      */
      function fixMarkup(value) {
        if (!(options.tabReplace || options.useBR)) {
          return value;
        }

        return value.replace(fixMarkupRe, function(match, p1) {
            if (options.useBR && match === '\n') {
              return '<br>';
            } else if (options.tabReplace) {
              return p1.replace(/\t/g, options.tabReplace);
            }
            return '';
        });
      }

      function buildClassName(prevClassName, currentLang, resultLang) {
        var language = currentLang ? aliases[currentLang] : resultLang,
            result   = [prevClassName.trim()];

        if (!prevClassName.match(/\bhljs\b/)) {
          result.push('hljs');
        }

        if (prevClassName.indexOf(language) === -1) {
          result.push(language);
        }

        return result.join(' ').trim();
      }

      /*
      Applies highlighting to a DOM node containing code. Accepts a DOM node and
      two optional parameters for fixMarkup.
      */
      function highlightBlock(block) {
        var node, originalStream, result, resultNode, text;
        var language = blockLanguage(block);

        if (isNotHighlighted(language))
            return;

        if (options.useBR) {
          node = document.createElement('div');
          node.innerHTML = block.innerHTML.replace(/\n/g, '').replace(/<br[ \/]*>/g, '\n');
        } else {
          node = block;
        }
        text = node.textContent;
        result = language ? highlight(language, text, true) : highlightAuto(text);

        originalStream = nodeStream(node);
        if (originalStream.length) {
          resultNode = document.createElement('div');
          resultNode.innerHTML = result.value;
          result.value = mergeStreams(originalStream, nodeStream(resultNode), text);
        }
        result.value = fixMarkup(result.value);

        block.innerHTML = result.value;
        block.className = buildClassName(block.className, language, result.language);
        block.result = {
          language: result.language,
          re: result.relevance
        };
        if (result.second_best) {
          block.second_best = {
            language: result.second_best.language,
            re: result.second_best.relevance
          };
        }
      }

      /*
      Updates highlight.js global options with values passed in the form of an object.
      */
      function configure(user_options) {
        options = inherit(options, user_options);
      }

      /*
      Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
      */
      function initHighlighting() {
        if (initHighlighting.called)
          return;
        initHighlighting.called = true;

        var blocks = document.querySelectorAll('pre code');
        ArrayProto.forEach.call(blocks, highlightBlock);
      }

      /*
      Attaches highlighting to the page load event.
      */
      function initHighlightingOnLoad() {
        window.addEventListener('DOMContentLoaded', initHighlighting, false);
        window.addEventListener('load', initHighlighting, false);
      }

      var PLAINTEXT_LANGUAGE = { disableAutodetect: true };

      function registerLanguage(name, language) {
        var lang;
        try { lang = language(hljs); }
        catch (error) {
          console.error("Language definition for '{}' could not be registered.".replace("{}", name));
          // hard or soft error
          if (!SAFE_MODE) { throw error; } else { console.error(error); }
          // languages that have serious errors are replaced with essentially a
          // "plaintext" stand-in so that the code blocks will still get normal
          // css classes applied to them - and one bad language won't break the
          // entire highlighter
          lang = PLAINTEXT_LANGUAGE;
        }
        languages[name] = lang;
        lang.rawDefinition = language.bind(null,hljs);

        if (lang.aliases) {
          lang.aliases.forEach(function(alias) {aliases[alias] = name;});
        }
      }

      function listLanguages() {
        return objectKeys(languages);
      }

      /*
        intended usage: When one language truly requires another

        Unlike `getLanguage`, this will throw when the requested language
        is not available.
      */
      function requireLanguage(name) {
        var lang = getLanguage(name);
        if (lang) { return lang; }

        var err = new Error('The \'{}\' language is required, but not loaded.'.replace('{}',name));
        throw err;
      }

      function getLanguage(name) {
        name = (name || '').toLowerCase();
        return languages[name] || languages[aliases[name]];
      }

      function autoDetection(name) {
        var lang = getLanguage(name);
        return lang && !lang.disableAutodetect;
      }

      /* Interface definition */

      hljs.highlight = highlight;
      hljs.highlightAuto = highlightAuto;
      hljs.fixMarkup = fixMarkup;
      hljs.highlightBlock = highlightBlock;
      hljs.configure = configure;
      hljs.initHighlighting = initHighlighting;
      hljs.initHighlightingOnLoad = initHighlightingOnLoad;
      hljs.registerLanguage = registerLanguage;
      hljs.listLanguages = listLanguages;
      hljs.getLanguage = getLanguage;
      hljs.requireLanguage = requireLanguage;
      hljs.autoDetection = autoDetection;
      hljs.inherit = inherit;
      hljs.debugMode = function() { SAFE_MODE = false; };

      // Common regexps
      hljs.IDENT_RE = '[a-zA-Z]\\w*';
      hljs.UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
      hljs.NUMBER_RE = '\\b\\d+(\\.\\d+)?';
      hljs.C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
      hljs.BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
      hljs.RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

      // Common modes
      hljs.BACKSLASH_ESCAPE = {
        begin: '\\\\[\\s\\S]', relevance: 0
      };
      hljs.APOS_STRING_MODE = {
        className: 'string',
        begin: '\'', end: '\'',
        illegal: '\\n',
        contains: [hljs.BACKSLASH_ESCAPE]
      };
      hljs.QUOTE_STRING_MODE = {
        className: 'string',
        begin: '"', end: '"',
        illegal: '\\n',
        contains: [hljs.BACKSLASH_ESCAPE]
      };
      hljs.PHRASAL_WORDS_MODE = {
        begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
      };
      hljs.COMMENT = function (begin, end, inherits) {
        var mode = hljs.inherit(
          {
            className: 'comment',
            begin: begin, end: end,
            contains: []
          },
          inherits || {}
        );
        mode.contains.push(hljs.PHRASAL_WORDS_MODE);
        mode.contains.push({
          className: 'doctag',
          begin: '(?:TODO|FIXME|NOTE|BUG|XXX):',
          relevance: 0
        });
        return mode;
      };
      hljs.C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$');
      hljs.C_BLOCK_COMMENT_MODE = hljs.COMMENT('/\\*', '\\*/');
      hljs.HASH_COMMENT_MODE = hljs.COMMENT('#', '$');
      hljs.NUMBER_MODE = {
        className: 'number',
        begin: hljs.NUMBER_RE,
        relevance: 0
      };
      hljs.C_NUMBER_MODE = {
        className: 'number',
        begin: hljs.C_NUMBER_RE,
        relevance: 0
      };
      hljs.BINARY_NUMBER_MODE = {
        className: 'number',
        begin: hljs.BINARY_NUMBER_RE,
        relevance: 0
      };
      hljs.CSS_NUMBER_MODE = {
        className: 'number',
        begin: hljs.NUMBER_RE + '(' +
          '%|em|ex|ch|rem'  +
          '|vw|vh|vmin|vmax' +
          '|cm|mm|in|pt|pc|px' +
          '|deg|grad|rad|turn' +
          '|s|ms' +
          '|Hz|kHz' +
          '|dpi|dpcm|dppx' +
          ')?',
        relevance: 0
      };
      hljs.REGEXP_MODE = {
        className: 'regexp',
        begin: /\//, end: /\/[gimuy]*/,
        illegal: /\n/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          {
            begin: /\[/, end: /\]/,
            relevance: 0,
            contains: [hljs.BACKSLASH_ESCAPE]
          }
        ]
      };
      hljs.TITLE_MODE = {
        className: 'title',
        begin: hljs.IDENT_RE,
        relevance: 0
      };
      hljs.UNDERSCORE_TITLE_MODE = {
        className: 'title',
        begin: hljs.UNDERSCORE_IDENT_RE,
        relevance: 0
      };
      hljs.METHOD_GUARD = {
        // excludes method names from keyword processing
        begin: '\\.\\s*' + hljs.UNDERSCORE_IDENT_RE,
        relevance: 0
      };

      var constants = [
        hljs.BACKSLASH_ESCAPE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.PHRASAL_WORDS_MODE,
        hljs.COMMENT,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.HASH_COMMENT_MODE,
        hljs.NUMBER_MODE,
        hljs.C_NUMBER_MODE,
        hljs.BINARY_NUMBER_MODE,
        hljs.CSS_NUMBER_MODE,
        hljs.REGEXP_MODE,
        hljs.TITLE_MODE,
        hljs.UNDERSCORE_TITLE_MODE,
        hljs.METHOD_GUARD
      ];
      constants.forEach(function(obj) { deepFreeze(obj); });

      // https://github.com/substack/deep-freeze/blob/master/index.js
      function deepFreeze (o) {
        Object.freeze(o);

        var objIsFunction = typeof o === 'function';

        Object.getOwnPropertyNames(o).forEach(function (prop) {
          if (o.hasOwnProperty(prop)
          && o[prop] !== null
          && (typeof o[prop] === "object" || typeof o[prop] === "function")
          // IE11 fix: https://github.com/highlightjs/highlight.js/issues/2318
          // TODO: remove in the future
          && (objIsFunction ? prop !== 'caller' && prop !== 'callee' && prop !== 'arguments' : true)
          && !Object.isFrozen(o[prop])) {
            deepFreeze(o[prop]);
          }
        });

        return o;
      }

      return hljs;
    }));
    });

    /* node_modules\svelte-highlight\src\Highlight.svelte generated by Svelte v3.23.0 */
    const file = "node_modules\\svelte-highlight\\src\\Highlight.svelte";
    const get_default_slot_changes = dirty => ({ highlighted: dirty & /*highlighted*/ 2 });
    const get_default_slot_context = ctx => ({ highlighted: /*highlighted*/ ctx[1] });

    // (37:6) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*code*/ ctx[0]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*code*/ 1) set_data_dev(t, /*code*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(37:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (35:6) {#if highlighted !== undefined}
    function create_if_block(ctx) {
    	let html_tag;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(null);
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(/*highlighted*/ ctx[1], target, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*highlighted*/ 2) html_tag.p(/*highlighted*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(35:6) {#if highlighted !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (24:20)    
    function fallback_block(ctx) {
    	let pre;
    	let code_1;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*highlighted*/ ctx[1] !== undefined) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let pre_levels = [/*$$restProps*/ ctx[2]];
    	let pre_data = {};

    	for (let i = 0; i < pre_levels.length; i += 1) {
    		pre_data = assign(pre_data, pre_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			code_1 = element("code");
    			if_block.c();
    			add_location(code_1, file, 33, 4, 735);
    			set_attributes(pre, pre_data);
    			toggle_class(pre, "hljs", true);
    			add_location(pre, file, 24, 2, 591);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, code_1);
    			if_block.m(code_1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(pre, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(pre, "mouseover", /*mouseover_handler*/ ctx[8], false, false, false),
    					listen_dev(pre, "mouseenter", /*mouseenter_handler*/ ctx[9], false, false, false),
    					listen_dev(pre, "mouseleave", /*mouseleave_handler*/ ctx[10], false, false, false),
    					listen_dev(pre, "focus", /*focus_handler*/ ctx[11], false, false, false),
    					listen_dev(pre, "blur", /*blur_handler*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(code_1, null);
    				}
    			}

    			set_attributes(pre, pre_data = get_spread_update(pre_levels, [dirty & /*$$restProps*/ 4 && /*$$restProps*/ ctx[2]]));
    			toggle_class(pre, "hljs", true);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(24:20)    ",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, highlighted*/ 34) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*highlighted, code*/ 3) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const omit_props_names = ["language","code"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { language = { name: undefined, register: undefined } } = $$props;
    	let { code = undefined } = $$props;
    	const dispatch = createEventDispatcher();
    	let highlighted = undefined;

    	afterUpdate(() => {
    		if (highlighted) {
    			dispatch("highlight");
    		}
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Highlight", $$slots, ['default']);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function focus_handler(event) {
    		bubble($$self, event);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(2, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("language" in $$new_props) $$invalidate(3, language = $$new_props.language);
    		if ("code" in $$new_props) $$invalidate(0, code = $$new_props.code);
    		if ("$$scope" in $$new_props) $$invalidate(5, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		language,
    		code,
    		hljs: highlight,
    		createEventDispatcher,
    		afterUpdate,
    		dispatch,
    		highlighted
    	});

    	$$self.$inject_state = $$new_props => {
    		if ("language" in $$props) $$invalidate(3, language = $$new_props.language);
    		if ("code" in $$props) $$invalidate(0, code = $$new_props.code);
    		if ("highlighted" in $$props) $$invalidate(1, highlighted = $$new_props.highlighted);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*language, code*/ 9) {
    			 if (language.name && language.register) {
    				highlight.registerLanguage(language.name, language.register);
    				$$invalidate(1, highlighted = highlight.highlight(language.name, code).value);
    			}
    		}
    	};

    	return [
    		code,
    		highlighted,
    		$$restProps,
    		language,
    		dispatch,
    		$$scope,
    		$$slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		focus_handler,
    		blur_handler
    	];
    }

    class Highlight extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { language: 3, code: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Highlight",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get language() {
    		throw new Error("<Highlight>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set language(value) {
    		throw new Error("<Highlight>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get code() {
    		throw new Error("<Highlight>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set code(value) {
    		throw new Error("<Highlight>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var json = function(hljs) {
      var LITERALS = {literal: 'true false null'};
      var ALLOWED_COMMENTS = [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ];
      var TYPES = [
        hljs.QUOTE_STRING_MODE,
        hljs.C_NUMBER_MODE
      ];
      var VALUE_CONTAINER = {
        end: ',', endsWithParent: true, excludeEnd: true,
        contains: TYPES,
        keywords: LITERALS
      };
      var OBJECT = {
        begin: '{', end: '}',
        contains: [
          {
            className: 'attr',
            begin: /"/, end: /"/,
            contains: [hljs.BACKSLASH_ESCAPE],
            illegal: '\\n',
          },
          hljs.inherit(VALUE_CONTAINER, {begin: /:/})
        ].concat(ALLOWED_COMMENTS),
        illegal: '\\S'
      };
      var ARRAY = {
        begin: '\\[', end: '\\]',
        contains: [hljs.inherit(VALUE_CONTAINER)], // inherit is a workaround for a bug that makes shared modes with endsWithParent compile only the ending of one of the parents
        illegal: '\\S'
      };
      TYPES.push(OBJECT, ARRAY);
      ALLOWED_COMMENTS.forEach(function(rule) {
        TYPES.push(rule);
      });
      return {
        contains: TYPES,
        keywords: LITERALS,
        illegal: '\\S'
      };
    };

    var json$1 = { name: 'json', register: json };

    const arduinoLight = `<style>/*

ArduinoÂ® Light Theme - Stefania Mellai <s.mellai@arduino.cc>

*/

.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
  background: #FFFFFF;
}

.hljs,
.hljs-subst {
  color: #434f54;
}

.hljs-keyword,
.hljs-attribute,
.hljs-selector-tag,
.hljs-doctag,
.hljs-name {
  color: #00979D;
}

.hljs-built_in,
.hljs-literal,
.hljs-bullet,
.hljs-code,
.hljs-addition {
  color: #D35400;
}

.hljs-regexp,
.hljs-symbol,
.hljs-variable,
.hljs-template-variable,
.hljs-link,
.hljs-selector-attr,
.hljs-selector-pseudo {
  color: #00979D;
}

.hljs-type,
.hljs-string,
.hljs-selector-id,
.hljs-selector-class,
.hljs-quote,
.hljs-template-tag,
.hljs-deletion {
  color: #005C5F;
}

.hljs-title,
.hljs-section {
  color: #880000;
  font-weight: bold;
}

.hljs-comment {
  color: rgba(149,165,166,.8);
}

.hljs-meta-keyword {
  color: #728E00;
}

.hljs-meta {
  color: #434f54;
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}

.hljs-function {
  color: #728E00;
}

.hljs-number {
  color: #8A7B52;  
}
</style>`;

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /**
     * Stores
     */
    const isLoading = writable(true);
    const isAuthenticated = writable(false);
    const accessToken = writable('');
    const idToken = writable('');
    const userInfo = writable({});
    const authError = writable(null);

    /**
     * Context Keys
     *
     * using an object literal means the keys are guaranteed not to conflict in any circumstance (since an object only has
     * referential equality to itself, i.e. {} !== {} whereas "x" === "x"), even when you have multiple different contexts
     * operating across many component layers.
     */
    const OIDC_CONTEXT_CLIENT_PROMISE = {};
    const OIDC_CONTEXT_REDIRECT_URI = {};
    const OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI = {};

    /**
     * Refresh the accessToken store.
     */
    async function refreshToken() {
        const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE);
        const token = await oidc.signinSilent();
        accessToken.set(token.accessToken);
        idToken.set(token.idToken);
    }

    /**
     * Initiate Register/Login flow.
     *
     * @param {boolean} preserveRoute - store current location so callback handler will navigate back to it.
     * @param {string} callback_url - explicit path to use for the callback.
     */
    async function login(preserveRoute = true, callback_url = null) {
        const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE);
        const redirect_uri =  callback_url || getContext(OIDC_CONTEXT_REDIRECT_URI) || window.location.href;

        // try to keep the user on the same page from which they triggered login. If set to false should typically
        // cause redirect to /.
        const appState = (preserveRoute) ? { pathname: window.location.pathname, search: window.location.search } : {};
        await oidc.signinRedirect({ redirect_uri, appState });
    }

    /**
     * Log out the current user.
     *
     * @param {string} logout_url - specify the url to return to after login.
     */
    async function logout(logout_url = null) {
        const oidc = await getContext(OIDC_CONTEXT_CLIENT_PROMISE);
        const returnTo = logout_url || getContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI) || window.location.href;
        accessToken.set('');
        oidc.signoutRedirect({ returnTo });
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.
    // Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

    let nopLogger = {
        debug(){},
        info(){},
        warn(){},
        error(){}
    };

    const NONE = 0;
    const ERROR = 1;
    const WARN = 2;
    const INFO = 3;
    const DEBUG = 4;

    let logger;
    let level;

    class Log {
        static get NONE() {return NONE};
        static get ERROR() {return ERROR};
        static get WARN() {return WARN};
        static get INFO() {return INFO};
        static get DEBUG() {return DEBUG};
        
        static reset(){
            level = INFO;
            logger = nopLogger;
        }
        
        static get level(){
            return level;
        }
        static set level(value){
            if (NONE <= value && value <= DEBUG){
                level = value;
            }
            else {
                throw new Error("Invalid log level");
            }
        }
        
        static get logger(){
            return logger;
        }
        static set logger(value){
            if (!value.debug && value.info) {
                // just to stay backwards compat. can remove in 2.0
                value.debug = value.info;
            }

            if (value.debug && value.info && value.warn && value.error){
                logger = value;
            }
            else {
                throw new Error("Invalid logger");
            }
        }
        
        static debug(...args){
            if (level >= DEBUG){
                logger.debug.apply(logger, Array.from(args));
            }
        }
        static info(...args){
            if (level >= INFO){
                logger.info.apply(logger, Array.from(args));
            }
        }
        static warn(...args){
            if (level >= WARN){
                logger.warn.apply(logger, Array.from(args));
            }
        }
        static error(...args){
            if (level >= ERROR){
                logger.error.apply(logger, Array.from(args));
            }
        }
    }

    Log.reset();

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.
    // Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

    const timer = {
        setInterval: function (cb, duration) {
            return setInterval(cb, duration);
        },
        clearInterval: function (handle) {
            return clearInterval(handle);
        }
    };

    let testing = false;
    let request = null;

    class Global {

        static _testing() {
            testing = true;
        }

        static get location() {
            if (!testing) {
                return location;
            }
        }

        static get localStorage() {
            if (!testing && typeof window !== 'undefined') {
                return localStorage;
            }
        }

        static get sessionStorage() {
            if (!testing && typeof window !== 'undefined') {
                return sessionStorage;
            }
        }

        static setXMLHttpRequest(newRequest) {
            request = newRequest;
        }

        static get XMLHttpRequest() {
            if (!testing && typeof window !== 'undefined') {
                return request || XMLHttpRequest;
            }
        }

        static get timer() {
            if (!testing) {
                return timer;
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class WebStorageStateStore {
        constructor({prefix = "oidc.", store = Global.localStorage} = {}) {
            this._store = store;
            this._prefix = prefix;
        }

        set(key, value) {
            Log.debug("WebStorageStateStore.set", key);

            key = this._prefix + key;

            this._store.setItem(key, value);

            return Promise.resolve();
        }

        get(key) {
            Log.debug("WebStorageStateStore.get", key);

            key = this._prefix + key;

            let item = this._store.getItem(key);

            return Promise.resolve(item);
        }

        remove(key) {
            Log.debug("WebStorageStateStore.remove", key);

            key = this._prefix + key;

            let item = this._store.getItem(key);
            this._store.removeItem(key);

            return Promise.resolve(item);
        }

        getAllKeys() {
            Log.debug("WebStorageStateStore.getAllKeys");

            var keys = [];

            for (let index = 0; index < this._store.length; index++) {
                let key = this._store.key(index);

                if (key.indexOf(this._prefix) === 0) {
                    keys.push(key.substr(this._prefix.length));
                }
            }

            return Promise.resolve(keys);
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class JsonService {
        constructor(
            additionalContentTypes = null, 
            XMLHttpRequestCtor = Global.XMLHttpRequest, 
            jwtHandler = null
        ) {
            if (additionalContentTypes && Array.isArray(additionalContentTypes))
            {
                this._contentTypes = additionalContentTypes.slice();
            }
            else
            {
                this._contentTypes = [];
            }
            this._contentTypes.push('application/json');
            if (jwtHandler) {
                this._contentTypes.push('application/jwt');
            }

            this._XMLHttpRequest = XMLHttpRequestCtor;
            this._jwtHandler = jwtHandler;
        }

        getJson(url, token) {
            if (!url){
                Log.error("JsonService.getJson: No url passed");
                throw new Error("url");
            }

            Log.debug("JsonService.getJson, url: ", url);

            return new Promise((resolve, reject) => {

                var req = new this._XMLHttpRequest();
                req.open('GET', url);

                var allowedContentTypes = this._contentTypes;
                var jwtHandler = this._jwtHandler;

                req.onload = function() {
                    Log.debug("JsonService.getJson: HTTP response received, status", req.status);

                    if (req.status === 200) {

                        var contentType = req.getResponseHeader("Content-Type");
                        if (contentType) {

                            var found = allowedContentTypes.find(item=>{
                                if (contentType.startsWith(item)) {
                                    return true;
                                }
                            });

                            if (found == "application/jwt") {
                                jwtHandler(req).then(resolve, reject);
                                return;
                            }

                            if (found) {
                                try {
                                    resolve(JSON.parse(req.responseText));
                                    return;
                                }
                                catch (e) {
                                    Log.error("JsonService.getJson: Error parsing JSON response", e.message);
                                    reject(e);
                                    return;
                                }
                            }
                        }

                        reject(Error("Invalid response Content-Type: " + contentType + ", from URL: " + url));
                    }
                    else {
                        reject(Error(req.statusText + " (" + req.status + ")"));
                    }
                };

                req.onerror = function() {
                    Log.error("JsonService.getJson: network error");
                    reject(Error("Network Error"));
                };

                if (token) {
                    Log.debug("JsonService.getJson: token passed, setting Authorization header");
                    req.setRequestHeader("Authorization", "Bearer " + token);
                }

                req.send();
            });
        }

        postForm(url, payload) {
            if (!url){
                Log.error("JsonService.postForm: No url passed");
                throw new Error("url");
            }

            Log.debug("JsonService.postForm, url: ", url);

            return new Promise((resolve, reject) => {

                var req = new this._XMLHttpRequest();
                req.open('POST', url);

                var allowedContentTypes = this._contentTypes;

                req.onload = function() {
                    Log.debug("JsonService.postForm: HTTP response received, status", req.status);

                    if (req.status === 200) {

                        var contentType = req.getResponseHeader("Content-Type");
                        if (contentType) {

                            var found = allowedContentTypes.find(item=>{
                                if (contentType.startsWith(item)) {
                                    return true;
                                }
                            });

                            if (found) {
                                try {
                                    resolve(JSON.parse(req.responseText));
                                    return;
                                }
                                catch (e) {
                                    Log.error("JsonService.postForm: Error parsing JSON response", e.message);
                                    reject(e);
                                    return;
                                }
                            }
                        }

                        reject(Error("Invalid response Content-Type: " + contentType + ", from URL: " + url));
                        return;
                    }

                    if (req.status === 400) {

                        var contentType = req.getResponseHeader("Content-Type");
                        if (contentType) {

                            var found = allowedContentTypes.find(item=>{
                                if (contentType.startsWith(item)) {
                                    return true;
                                }
                            });

                            if (found) {
                                try {
                                    var payload = JSON.parse(req.responseText);
                                    if (payload && payload.error) {
                                        Log.error("JsonService.postForm: Error from server: ", payload.error);
                                        reject(new Error(payload.error));
                                        return;
                                    }
                                }
                                catch (e) {
                                    Log.error("JsonService.postForm: Error parsing JSON response", e.message);
                                    reject(e);
                                    return;
                                }
                            }
                        }
                    }

                    reject(Error(req.statusText + " (" + req.status + ")"));
                };

                req.onerror = function() {
                    Log.error("JsonService.postForm: network error");
                    reject(Error("Network Error"));
                };

                let body = "";
                for(let key in payload) {

                    let value = payload[key];

                    if (value) {

                        if (body.length > 0) {
                            body += "&";
                        }

                        body += encodeURIComponent(key);
                        body += "=";
                        body += encodeURIComponent(value);
                    }
                }

                req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                req.send(body);
            });
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const OidcMetadataUrlPath = '.well-known/openid-configuration';

    class MetadataService {
        constructor(settings, JsonServiceCtor = JsonService) {
            if (!settings) {
                Log.error("MetadataService: No settings passed to MetadataService");
                throw new Error("settings");
            }

            this._settings = settings;
            this._jsonService = new JsonServiceCtor(['application/jwk-set+json']);
            this._metadata_promise;
        }

        get metadataUrl() {
            if (!this._metadataUrl) {
                if (this._settings.metadataUrl) {
                    this._metadataUrl = this._settings.metadataUrl;
                }
                else {
                    this._metadataUrl = this._settings.authority;

                    if (this._metadataUrl && this._metadataUrl.indexOf(OidcMetadataUrlPath) < 0) {
                        if (this._metadataUrl[this._metadataUrl.length - 1] !== '/') {
                            this._metadataUrl += '/';
                        }
                        this._metadataUrl += OidcMetadataUrlPath;
                    }
                }
            }

            return this._metadataUrl;
        }

        getMetadata() {
            // metadata was preloaded and no url was provided, so use the supplied data.
            if (!this.metadataUrl && this._settings.metadata) {
                Log.debug("MetadataService.getMetadata: Returning metadata from settings");
                return Promise.resolve(this._settings.metadata);
            }

            // no url was provided and settings were not pre-loaded then throw an error.
            if (!this.metadataUrl) {
                Log.error("MetadataService.getMetadata: No authority or metadataUrl configured on settings");
                return Promise.reject(new Error("No authority or metadataUrl configured on settings"));
            }

            // if we've already started fetching metadata return the existing promise so we don't call it again.
            if (this._metadata_promise) {
                Log.debug("MetadataService.getMetadata: getting metadata from cache promise", this.metadataUrl);
                return this._metadata_promise
            }

            Log.debug("MetadataService.getMetadata: getting metadata from", this.metadataUrl);

            this._metadata_promise = this._jsonService.getJson(this.metadataUrl)
                .then(metadata => {
                    Log.debug("MetadataService.getMetadata: json received");
                    // overlay .well-known/openid-configuration over seeded setting. this allows consumers to set values
                    // like end_session_url for Auth0 when it is not available in the configuration endpoint.
                    // precedence was set on the assumption the issuers hosted configuration is always more accurate
                    // than what the developer seeded the client with.
                    if (!this._settings.metadata) this._settings.metadata = {};
                    Object.assign(this._settings.metadata, metadata);
                    return this._settings.metadata;
                });

            return this._metadata_promise;
        }

        getIssuer() {
            return this._getMetadataProperty("issuer");
        }

        getAuthorizationEndpoint() {
            return this._getMetadataProperty("authorization_endpoint");
        }

        getUserInfoEndpoint() {
            return this._getMetadataProperty("userinfo_endpoint");
        }

        getTokenEndpoint(optional=true) {
            return this._getMetadataProperty("token_endpoint", optional);
        }

        getCheckSessionIframe() {
            return this._getMetadataProperty("check_session_iframe", true);
        }

        getEndSessionEndpoint() {
            return this._getMetadataProperty("end_session_endpoint", true);
        }

        getRevocationEndpoint() {
            return this._getMetadataProperty("revocation_endpoint", true);
        }

        getKeysEndpoint() {
            return this._getMetadataProperty("jwks_uri", true);
        }

        _getMetadataProperty(name, optional=false) {
            Log.debug("MetadataService.getMetadataProperty for: " + name);

            return this.getMetadata().then(metadata => {
                Log.debug("MetadataService.getMetadataProperty: metadata recieved");

                if (metadata[name] === undefined) {

                    if (optional === true) {
                        Log.warn("MetadataService.getMetadataProperty: Metadata does not contain optional property " + name);
                        return undefined;
                    }
                    else {
                        Log.error("MetadataService.getMetadataProperty: Metadata does not contain property " + name);
                        throw new Error("Metadata does not contain property " + name);
                    }
                }

                return metadata[name];
            });
        }

        getSigningKeys() {
            if (this._settings.signingKeys) {
                Log.debug("MetadataService.getSigningKeys: Returning signingKeys from settings");
                return Promise.resolve(this._settings.signingKeys);
            }

            return this._getMetadataProperty("jwks_uri").then(jwks_uri => {
                Log.debug("MetadataService.getSigningKeys: jwks_uri received", jwks_uri);

                return this._jsonService.getJson(jwks_uri).then(keySet => {
                    Log.debug("MetadataService.getSigningKeys: key set received", keySet);

                    if (!keySet.keys) {
                        Log.error("MetadataService.getSigningKeys: Missing keys on keyset");
                        throw new Error("Missing keys on keyset");
                    }

                    this._settings.signingKeys = keySet.keys;
                    return this._settings.signingKeys;
                });
            });
        }
    }

    /*
     * jsrsasign(all) 8.0.12 (2018-04-22) (c) 2010-2018 Kenji Urushima | kjur.github.com/jsrsasign/license
     */

    var navigator = {};
    navigator.userAgent = false;

    var window$1 = {};

    /*!
    Copyright (c) 2011, Yahoo! Inc. All rights reserved.
    Code licensed under the BSD License:
    http://developer.yahoo.com/yui/license.html
    version: 2.9.0
    */
    if(YAHOO===undefined){var YAHOO={};}YAHOO.lang={extend:function(g,h,f){if(!h||!g){throw new Error("YAHOO.lang.extend failed, please check that all dependencies are included.")}var d=function(){};d.prototype=h.prototype;g.prototype=new d();g.prototype.constructor=g;g.superclass=h.prototype;if(h.prototype.constructor==Object.prototype.constructor){h.prototype.constructor=h;}if(f){var b;for(b in f){g.prototype[b]=f[b];}var e=function(){},c=["toString","valueOf"];try{if(/MSIE/.test(navigator.userAgent)){e=function(j,i){for(b=0;b<c.length;b=b+1){var l=c[b],k=i[l];if(typeof k==="function"&&k!=Object.prototype[l]){j[l]=k;}}};}}catch(a){}e(g.prototype,f);}}};
    /*! CryptoJS v3.1.2 core-fix.js
     * code.google.com/p/crypto-js
     * (c) 2009-2013 by Jeff Mott. All rights reserved.
     * code.google.com/p/crypto-js/wiki/License
     * THIS IS FIX of 'core.js' to fix Hmac issue.
     * https://code.google.com/p/crypto-js/issues/detail?id=84
     * https://crypto-js.googlecode.com/svn-history/r667/branches/3.x/src/core.js
     */
    var CryptoJS=CryptoJS||(function(e,g){var a={};var b=a.lib={};var j=b.Base=(function(){function n(){}return {extend:function(p){n.prototype=this;var o=new n();if(p){o.mixIn(p);}if(!o.hasOwnProperty("init")){o.init=function(){o.$super.init.apply(this,arguments);};}o.init.prototype=o;o.$super=this;return o},create:function(){var o=this.extend();o.init.apply(o,arguments);return o},init:function(){},mixIn:function(p){for(var o in p){if(p.hasOwnProperty(o)){this[o]=p[o];}}if(p.hasOwnProperty("toString")){this.toString=p.toString;}},clone:function(){return this.init.prototype.extend(this)}}}());var l=b.WordArray=j.extend({init:function(o,n){o=this.words=o||[];if(n!=g){this.sigBytes=n;}else{this.sigBytes=o.length*4;}},toString:function(n){return (n||h).stringify(this)},concat:function(t){var q=this.words;var p=t.words;var n=this.sigBytes;var s=t.sigBytes;this.clamp();if(n%4){for(var r=0;r<s;r++){var o=(p[r>>>2]>>>(24-(r%4)*8))&255;q[(n+r)>>>2]|=o<<(24-((n+r)%4)*8);}}else{for(var r=0;r<s;r+=4){q[(n+r)>>>2]=p[r>>>2];}}this.sigBytes+=s;return this},clamp:function(){var o=this.words;var n=this.sigBytes;o[n>>>2]&=4294967295<<(32-(n%4)*8);o.length=e.ceil(n/4);},clone:function(){var n=j.clone.call(this);n.words=this.words.slice(0);return n},random:function(p){var o=[];for(var n=0;n<p;n+=4){o.push((e.random()*4294967296)|0);}return new l.init(o,p)}});var m=a.enc={};var h=m.Hex={stringify:function(p){var r=p.words;var o=p.sigBytes;var q=[];for(var n=0;n<o;n++){var s=(r[n>>>2]>>>(24-(n%4)*8))&255;q.push((s>>>4).toString(16));q.push((s&15).toString(16));}return q.join("")},parse:function(p){var n=p.length;var q=[];for(var o=0;o<n;o+=2){q[o>>>3]|=parseInt(p.substr(o,2),16)<<(24-(o%8)*4);}return new l.init(q,n/2)}};var d=m.Latin1={stringify:function(q){var r=q.words;var p=q.sigBytes;var n=[];for(var o=0;o<p;o++){var s=(r[o>>>2]>>>(24-(o%4)*8))&255;n.push(String.fromCharCode(s));}return n.join("")},parse:function(p){var n=p.length;var q=[];for(var o=0;o<n;o++){q[o>>>2]|=(p.charCodeAt(o)&255)<<(24-(o%4)*8);}return new l.init(q,n)}};var c=m.Utf8={stringify:function(n){try{return decodeURIComponent(escape(d.stringify(n)))}catch(o){throw new Error("Malformed UTF-8 data")}},parse:function(n){return d.parse(unescape(encodeURIComponent(n)))}};var i=b.BufferedBlockAlgorithm=j.extend({reset:function(){this._data=new l.init();this._nDataBytes=0;},_append:function(n){if(typeof n=="string"){n=c.parse(n);}this._data.concat(n);this._nDataBytes+=n.sigBytes;},_process:function(w){var q=this._data;var x=q.words;var n=q.sigBytes;var t=this.blockSize;var v=t*4;var u=n/v;if(w){u=e.ceil(u);}else{u=e.max((u|0)-this._minBufferSize,0);}var s=u*t;var r=e.min(s*4,n);if(s){for(var p=0;p<s;p+=t){this._doProcessBlock(x,p);}var o=x.splice(0,s);q.sigBytes-=r;}return new l.init(o,r)},clone:function(){var n=j.clone.call(this);n._data=this._data.clone();return n},_minBufferSize:0});var f=b.Hasher=i.extend({cfg:j.extend(),init:function(n){this.cfg=this.cfg.extend(n);this.reset();},reset:function(){i.reset.call(this);this._doReset();},update:function(n){this._append(n);this._process();return this},finalize:function(n){if(n){this._append(n);}var o=this._doFinalize();return o},blockSize:512/32,_createHelper:function(n){return function(p,o){return new n.init(o).finalize(p)}},_createHmacHelper:function(n){return function(p,o){return new k.HMAC.init(n,o).finalize(p)}}});var k=a.algo={};return a}(Math));
    /*
    CryptoJS v3.1.2 x64-core-min.js
    code.google.com/p/crypto-js
    (c) 2009-2013 by Jeff Mott. All rights reserved.
    code.google.com/p/crypto-js/wiki/License
    */
    (function(g){var a=CryptoJS,f=a.lib,e=f.Base,h=f.WordArray,a=a.x64={};a.Word=e.extend({init:function(b,c){this.high=b;this.low=c;}});a.WordArray=e.extend({init:function(b,c){b=this.words=b||[];this.sigBytes=c!=g?c:8*b.length;},toX32:function(){for(var b=this.words,c=b.length,a=[],d=0;d<c;d++){var e=b[d];a.push(e.high);a.push(e.low);}return h.create(a,this.sigBytes)},clone:function(){for(var b=e.clone.call(this),c=b.words=this.words.slice(0),a=c.length,d=0;d<a;d++)c[d]=c[d].clone();return b}});})();

    /*
    CryptoJS v3.1.2 enc-base64.js
    code.google.com/p/crypto-js
    (c) 2009-2013 by Jeff Mott. All rights reserved.
    code.google.com/p/crypto-js/wiki/License
    */
    (function(){var h=CryptoJS,j=h.lib.WordArray;h.enc.Base64={stringify:function(b){var e=b.words,f=b.sigBytes,c=this._map;b.clamp();b=[];for(var a=0;a<f;a+=3)for(var d=(e[a>>>2]>>>24-8*(a%4)&255)<<16|(e[a+1>>>2]>>>24-8*((a+1)%4)&255)<<8|e[a+2>>>2]>>>24-8*((a+2)%4)&255,g=0;4>g&&a+0.75*g<f;g++)b.push(c.charAt(d>>>6*(3-g)&63));if(e=c.charAt(64))for(;b.length%4;)b.push(e);return b.join("")},parse:function(b){var e=b.length,f=this._map,c=f.charAt(64);c&&(c=b.indexOf(c),-1!=c&&(e=c));for(var c=[],a=0,d=0;d<
    e;d++)if(d%4){var g=f.indexOf(b.charAt(d-1))<<2*(d%4),h=f.indexOf(b.charAt(d))>>>6-2*(d%4);c[a>>>2]|=(g|h)<<24-8*(a%4);a++;}return j.create(c,a)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="};})();

    /*
    CryptoJS v3.1.2 sha256-min.js
    code.google.com/p/crypto-js
    (c) 2009-2013 by Jeff Mott. All rights reserved.
    code.google.com/p/crypto-js/wiki/License
    */
    (function(k){for(var g=CryptoJS,h=g.lib,v=h.WordArray,j=h.Hasher,h=g.algo,s=[],t=[],u=function(q){return 4294967296*(q-(q|0))|0},l=2,b=0;64>b;){var d;a:{d=l;for(var w=k.sqrt(d),r=2;r<=w;r++)if(!(d%r)){d=!1;break a}d=!0;}d&&(8>b&&(s[b]=u(k.pow(l,0.5))),t[b]=u(k.pow(l,1/3)),b++);l++;}var n=[],h=h.SHA256=j.extend({_doReset:function(){this._hash=new v.init(s.slice(0));},_doProcessBlock:function(q,h){for(var a=this._hash.words,c=a[0],d=a[1],b=a[2],k=a[3],f=a[4],g=a[5],j=a[6],l=a[7],e=0;64>e;e++){if(16>e)n[e]=
    q[h+e]|0;else{var m=n[e-15],p=n[e-2];n[e]=((m<<25|m>>>7)^(m<<14|m>>>18)^m>>>3)+n[e-7]+((p<<15|p>>>17)^(p<<13|p>>>19)^p>>>10)+n[e-16];}m=l+((f<<26|f>>>6)^(f<<21|f>>>11)^(f<<7|f>>>25))+(f&g^~f&j)+t[e]+n[e];p=((c<<30|c>>>2)^(c<<19|c>>>13)^(c<<10|c>>>22))+(c&d^c&b^d&b);l=j;j=g;g=f;f=k+m|0;k=b;b=d;d=c;c=m+p|0;}a[0]=a[0]+c|0;a[1]=a[1]+d|0;a[2]=a[2]+b|0;a[3]=a[3]+k|0;a[4]=a[4]+f|0;a[5]=a[5]+g|0;a[6]=a[6]+j|0;a[7]=a[7]+l|0;},_doFinalize:function(){var d=this._data,b=d.words,a=8*this._nDataBytes,c=8*d.sigBytes;
    b[c>>>5]|=128<<24-c%32;b[(c+64>>>9<<4)+14]=k.floor(a/4294967296);b[(c+64>>>9<<4)+15]=a;d.sigBytes=4*b.length;this._process();return this._hash},clone:function(){var b=j.clone.call(this);b._hash=this._hash.clone();return b}});g.SHA256=j._createHelper(h);g.HmacSHA256=j._createHmacHelper(h);})(Math);

    /*
    CryptoJS v3.1.2 sha512-min.js
    code.google.com/p/crypto-js
    (c) 2009-2013 by Jeff Mott. All rights reserved.
    code.google.com/p/crypto-js/wiki/License
    */
    (function(){function a(){return d.create.apply(d,arguments)}for(var n=CryptoJS,r=n.lib.Hasher,e=n.x64,d=e.Word,T=e.WordArray,e=n.algo,ea=[a(1116352408,3609767458),a(1899447441,602891725),a(3049323471,3964484399),a(3921009573,2173295548),a(961987163,4081628472),a(1508970993,3053834265),a(2453635748,2937671579),a(2870763221,3664609560),a(3624381080,2734883394),a(310598401,1164996542),a(607225278,1323610764),a(1426881987,3590304994),a(1925078388,4068182383),a(2162078206,991336113),a(2614888103,633803317),
    a(3248222580,3479774868),a(3835390401,2666613458),a(4022224774,944711139),a(264347078,2341262773),a(604807628,2007800933),a(770255983,1495990901),a(1249150122,1856431235),a(1555081692,3175218132),a(1996064986,2198950837),a(2554220882,3999719339),a(2821834349,766784016),a(2952996808,2566594879),a(3210313671,3203337956),a(3336571891,1034457026),a(3584528711,2466948901),a(113926993,3758326383),a(338241895,168717936),a(666307205,1188179964),a(773529912,1546045734),a(1294757372,1522805485),a(1396182291,
    2643833823),a(1695183700,2343527390),a(1986661051,1014477480),a(2177026350,1206759142),a(2456956037,344077627),a(2730485921,1290863460),a(2820302411,3158454273),a(3259730800,3505952657),a(3345764771,106217008),a(3516065817,3606008344),a(3600352804,1432725776),a(4094571909,1467031594),a(275423344,851169720),a(430227734,3100823752),a(506948616,1363258195),a(659060556,3750685593),a(883997877,3785050280),a(958139571,3318307427),a(1322822218,3812723403),a(1537002063,2003034995),a(1747873779,3602036899),
    a(1955562222,1575990012),a(2024104815,1125592928),a(2227730452,2716904306),a(2361852424,442776044),a(2428436474,593698344),a(2756734187,3733110249),a(3204031479,2999351573),a(3329325298,3815920427),a(3391569614,3928383900),a(3515267271,566280711),a(3940187606,3454069534),a(4118630271,4000239992),a(116418474,1914138554),a(174292421,2731055270),a(289380356,3203993006),a(460393269,320620315),a(685471733,587496836),a(852142971,1086792851),a(1017036298,365543100),a(1126000580,2618297676),a(1288033470,
    3409855158),a(1501505948,4234509866),a(1607167915,987167468),a(1816402316,1246189591)],v=[],w=0;80>w;w++)v[w]=a();e=e.SHA512=r.extend({_doReset:function(){this._hash=new T.init([new d.init(1779033703,4089235720),new d.init(3144134277,2227873595),new d.init(1013904242,4271175723),new d.init(2773480762,1595750129),new d.init(1359893119,2917565137),new d.init(2600822924,725511199),new d.init(528734635,4215389547),new d.init(1541459225,327033209)]);},_doProcessBlock:function(a,d){for(var f=this._hash.words,
    F=f[0],e=f[1],n=f[2],r=f[3],G=f[4],H=f[5],I=f[6],f=f[7],w=F.high,J=F.low,X=e.high,K=e.low,Y=n.high,L=n.low,Z=r.high,M=r.low,$=G.high,N=G.low,aa=H.high,O=H.low,ba=I.high,P=I.low,ca=f.high,Q=f.low,k=w,g=J,z=X,x=K,A=Y,y=L,U=Z,B=M,l=$,h=N,R=aa,C=O,S=ba,D=P,V=ca,E=Q,m=0;80>m;m++){var s=v[m];if(16>m)var j=s.high=a[d+2*m]|0,b=s.low=a[d+2*m+1]|0;else{var j=v[m-15],b=j.high,p=j.low,j=(b>>>1|p<<31)^(b>>>8|p<<24)^b>>>7,p=(p>>>1|b<<31)^(p>>>8|b<<24)^(p>>>7|b<<25),u=v[m-2],b=u.high,c=u.low,u=(b>>>19|c<<13)^(b<<
    3|c>>>29)^b>>>6,c=(c>>>19|b<<13)^(c<<3|b>>>29)^(c>>>6|b<<26),b=v[m-7],W=b.high,t=v[m-16],q=t.high,t=t.low,b=p+b.low,j=j+W+(b>>>0<p>>>0?1:0),b=b+c,j=j+u+(b>>>0<c>>>0?1:0),b=b+t,j=j+q+(b>>>0<t>>>0?1:0);s.high=j;s.low=b;}var W=l&R^~l&S,t=h&C^~h&D,s=k&z^k&A^z&A,T=g&x^g&y^x&y,p=(k>>>28|g<<4)^(k<<30|g>>>2)^(k<<25|g>>>7),u=(g>>>28|k<<4)^(g<<30|k>>>2)^(g<<25|k>>>7),c=ea[m],fa=c.high,da=c.low,c=E+((h>>>14|l<<18)^(h>>>18|l<<14)^(h<<23|l>>>9)),q=V+((l>>>14|h<<18)^(l>>>18|h<<14)^(l<<23|h>>>9))+(c>>>0<E>>>0?1:
    0),c=c+t,q=q+W+(c>>>0<t>>>0?1:0),c=c+da,q=q+fa+(c>>>0<da>>>0?1:0),c=c+b,q=q+j+(c>>>0<b>>>0?1:0),b=u+T,s=p+s+(b>>>0<u>>>0?1:0),V=S,E=D,S=R,D=C,R=l,C=h,h=B+c|0,l=U+q+(h>>>0<B>>>0?1:0)|0,U=A,B=y,A=z,y=x,z=k,x=g,g=c+b|0,k=q+s+(g>>>0<c>>>0?1:0)|0;}J=F.low=J+g;F.high=w+k+(J>>>0<g>>>0?1:0);K=e.low=K+x;e.high=X+z+(K>>>0<x>>>0?1:0);L=n.low=L+y;n.high=Y+A+(L>>>0<y>>>0?1:0);M=r.low=M+B;r.high=Z+U+(M>>>0<B>>>0?1:0);N=G.low=N+h;G.high=$+l+(N>>>0<h>>>0?1:0);O=H.low=O+C;H.high=aa+R+(O>>>0<C>>>0?1:0);P=I.low=P+D;
    I.high=ba+S+(P>>>0<D>>>0?1:0);Q=f.low=Q+E;f.high=ca+V+(Q>>>0<E>>>0?1:0);},_doFinalize:function(){var a=this._data,d=a.words,f=8*this._nDataBytes,e=8*a.sigBytes;d[e>>>5]|=128<<24-e%32;d[(e+128>>>10<<5)+30]=Math.floor(f/4294967296);d[(e+128>>>10<<5)+31]=f;a.sigBytes=4*d.length;this._process();return this._hash.toX32()},clone:function(){var a=r.clone.call(this);a._hash=this._hash.clone();return a},blockSize:32});n.SHA512=r._createHelper(e);n.HmacSHA512=r._createHmacHelper(e);})();

    /*
    CryptoJS v3.1.2 sha384-min.js
    code.google.com/p/crypto-js
    (c) 2009-2013 by Jeff Mott. All rights reserved.
    code.google.com/p/crypto-js/wiki/License
    */
    (function(){var c=CryptoJS,a=c.x64,b=a.Word,e=a.WordArray,a=c.algo,d=a.SHA512,a=a.SHA384=d.extend({_doReset:function(){this._hash=new e.init([new b.init(3418070365,3238371032),new b.init(1654270250,914150663),new b.init(2438529370,812702999),new b.init(355462360,4144912697),new b.init(1731405415,4290775857),new b.init(2394180231,1750603025),new b.init(3675008525,1694076839),new b.init(1203062813,3204075428)]);},_doFinalize:function(){var a=d._doFinalize.call(this);a.sigBytes-=16;return a}});c.SHA384=
    d._createHelper(a);c.HmacSHA384=d._createHmacHelper(a);})();

    /*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
     */
    var b64map="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";var b64pad="=";function hex2b64(d){var b;var e;var a="";for(b=0;b+3<=d.length;b+=3){e=parseInt(d.substring(b,b+3),16);a+=b64map.charAt(e>>6)+b64map.charAt(e&63);}if(b+1==d.length){e=parseInt(d.substring(b,b+1),16);a+=b64map.charAt(e<<2);}else{if(b+2==d.length){e=parseInt(d.substring(b,b+2),16);a+=b64map.charAt(e>>2)+b64map.charAt((e&3)<<4);}}{while((a.length&3)>0){a+=b64pad;}}return a}function b64tohex(f){var d="";var e;var b=0;var c;var a;for(e=0;e<f.length;++e){if(f.charAt(e)==b64pad){break}a=b64map.indexOf(f.charAt(e));if(a<0){continue}if(b==0){d+=int2char(a>>2);c=a&3;b=1;}else{if(b==1){d+=int2char((c<<2)|(a>>4));c=a&15;b=2;}else{if(b==2){d+=int2char(c);d+=int2char(a>>2);c=a&3;b=3;}else{d+=int2char((c<<2)|(a>>4));d+=int2char(a&15);b=0;}}}}if(b==1){d+=int2char(c<<2);}return d}/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
     */
    var dbits;function BigInteger(e,d,f){if(e!=null){if("number"==typeof e){this.fromNumber(e,d,f);}else{if(d==null&&"string"!=typeof e){this.fromString(e,256);}else{this.fromString(e,d);}}}}function nbi(){return new BigInteger(null)}function am1(f,a,b,e,h,g){while(--g>=0){var d=a*this[f++]+b[e]+h;h=Math.floor(d/67108864);b[e++]=d&67108863;}return h}{{BigInteger.prototype.am=am1;dbits=26;}}BigInteger.prototype.DB=dbits;BigInteger.prototype.DM=((1<<dbits)-1);BigInteger.prototype.DV=(1<<dbits);var BI_FP=52;BigInteger.prototype.FV=Math.pow(2,BI_FP);BigInteger.prototype.F1=BI_FP-dbits;BigInteger.prototype.F2=2*dbits-BI_FP;var BI_RM="0123456789abcdefghijklmnopqrstuvwxyz";var BI_RC=new Array();var rr,vv;rr="0".charCodeAt(0);for(vv=0;vv<=9;++vv){BI_RC[rr++]=vv;}rr="a".charCodeAt(0);for(vv=10;vv<36;++vv){BI_RC[rr++]=vv;}rr="A".charCodeAt(0);for(vv=10;vv<36;++vv){BI_RC[rr++]=vv;}function int2char(a){return BI_RM.charAt(a)}function intAt(b,a){var d=BI_RC[b.charCodeAt(a)];return (d==null)?-1:d}function bnpCopyTo(b){for(var a=this.t-1;a>=0;--a){b[a]=this[a];}b.t=this.t;b.s=this.s;}function bnpFromInt(a){this.t=1;this.s=(a<0)?-1:0;if(a>0){this[0]=a;}else{if(a<-1){this[0]=a+this.DV;}else{this.t=0;}}}function nbv(a){var b=nbi();b.fromInt(a);return b}function bnpFromString(h,c){var e;if(c==16){e=4;}else{if(c==8){e=3;}else{if(c==256){e=8;}else{if(c==2){e=1;}else{if(c==32){e=5;}else{if(c==4){e=2;}else{this.fromRadix(h,c);return}}}}}}this.t=0;this.s=0;var g=h.length,d=false,f=0;while(--g>=0){var a=(e==8)?h[g]&255:intAt(h,g);if(a<0){if(h.charAt(g)=="-"){d=true;}continue}d=false;if(f==0){this[this.t++]=a;}else{if(f+e>this.DB){this[this.t-1]|=(a&((1<<(this.DB-f))-1))<<f;this[this.t++]=(a>>(this.DB-f));}else{this[this.t-1]|=a<<f;}}f+=e;if(f>=this.DB){f-=this.DB;}}if(e==8&&(h[0]&128)!=0){this.s=-1;if(f>0){this[this.t-1]|=((1<<(this.DB-f))-1)<<f;}}this.clamp();if(d){BigInteger.ZERO.subTo(this,this);}}function bnpClamp(){var a=this.s&this.DM;while(this.t>0&&this[this.t-1]==a){--this.t;}}function bnToString(c){if(this.s<0){return "-"+this.negate().toString(c)}var e;if(c==16){e=4;}else{if(c==8){e=3;}else{if(c==2){e=1;}else{if(c==32){e=5;}else{if(c==4){e=2;}else{return this.toRadix(c)}}}}}var g=(1<<e)-1,l,a=false,h="",f=this.t;var j=this.DB-(f*this.DB)%e;if(f-->0){if(j<this.DB&&(l=this[f]>>j)>0){a=true;h=int2char(l);}while(f>=0){if(j<e){l=(this[f]&((1<<j)-1))<<(e-j);l|=this[--f]>>(j+=this.DB-e);}else{l=(this[f]>>(j-=e))&g;if(j<=0){j+=this.DB;--f;}}if(l>0){a=true;}if(a){h+=int2char(l);}}}return a?h:"0"}function bnNegate(){var a=nbi();BigInteger.ZERO.subTo(this,a);return a}function bnAbs(){return (this.s<0)?this.negate():this}function bnCompareTo(b){var d=this.s-b.s;if(d!=0){return d}var c=this.t;d=c-b.t;if(d!=0){return (this.s<0)?-d:d}while(--c>=0){if((d=this[c]-b[c])!=0){return d}}return 0}function nbits(a){var c=1,b;if((b=a>>>16)!=0){a=b;c+=16;}if((b=a>>8)!=0){a=b;c+=8;}if((b=a>>4)!=0){a=b;c+=4;}if((b=a>>2)!=0){a=b;c+=2;}if((b=a>>1)!=0){a=b;c+=1;}return c}function bnBitLength(){if(this.t<=0){return 0}return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM))}function bnpDLShiftTo(c,b){var a;for(a=this.t-1;a>=0;--a){b[a+c]=this[a];}for(a=c-1;a>=0;--a){b[a]=0;}b.t=this.t+c;b.s=this.s;}function bnpDRShiftTo(c,b){for(var a=c;a<this.t;++a){b[a-c]=this[a];}b.t=Math.max(this.t-c,0);b.s=this.s;}function bnpLShiftTo(j,e){var b=j%this.DB;var a=this.DB-b;var g=(1<<a)-1;var f=Math.floor(j/this.DB),h=(this.s<<b)&this.DM,d;for(d=this.t-1;d>=0;--d){e[d+f+1]=(this[d]>>a)|h;h=(this[d]&g)<<b;}for(d=f-1;d>=0;--d){e[d]=0;}e[f]=h;e.t=this.t+f+1;e.s=this.s;e.clamp();}function bnpRShiftTo(g,d){d.s=this.s;var e=Math.floor(g/this.DB);if(e>=this.t){d.t=0;return}var b=g%this.DB;var a=this.DB-b;var f=(1<<b)-1;d[0]=this[e]>>b;for(var c=e+1;c<this.t;++c){d[c-e-1]|=(this[c]&f)<<a;d[c-e]=this[c]>>b;}if(b>0){d[this.t-e-1]|=(this.s&f)<<a;}d.t=this.t-e;d.clamp();}function bnpSubTo(d,f){var e=0,g=0,b=Math.min(d.t,this.t);while(e<b){g+=this[e]-d[e];f[e++]=g&this.DM;g>>=this.DB;}if(d.t<this.t){g-=d.s;while(e<this.t){g+=this[e];f[e++]=g&this.DM;g>>=this.DB;}g+=this.s;}else{g+=this.s;while(e<d.t){g-=d[e];f[e++]=g&this.DM;g>>=this.DB;}g-=d.s;}f.s=(g<0)?-1:0;if(g<-1){f[e++]=this.DV+g;}else{if(g>0){f[e++]=g;}}f.t=e;f.clamp();}function bnpMultiplyTo(c,e){var b=this.abs(),f=c.abs();var d=b.t;e.t=d+f.t;while(--d>=0){e[d]=0;}for(d=0;d<f.t;++d){e[d+b.t]=b.am(0,f[d],e,d,0,b.t);}e.s=0;e.clamp();if(this.s!=c.s){BigInteger.ZERO.subTo(e,e);}}function bnpSquareTo(d){var a=this.abs();var b=d.t=2*a.t;while(--b>=0){d[b]=0;}for(b=0;b<a.t-1;++b){var e=a.am(b,a[b],d,2*b,0,1);if((d[b+a.t]+=a.am(b+1,2*a[b],d,2*b+1,e,a.t-b-1))>=a.DV){d[b+a.t]-=a.DV;d[b+a.t+1]=1;}}if(d.t>0){d[d.t-1]+=a.am(b,a[b],d,2*b,0,1);}d.s=0;d.clamp();}function bnpDivRemTo(n,h,g){var w=n.abs();if(w.t<=0){return}var k=this.abs();if(k.t<w.t){if(h!=null){h.fromInt(0);}if(g!=null){this.copyTo(g);}return}if(g==null){g=nbi();}var d=nbi(),a=this.s,l=n.s;var v=this.DB-nbits(w[w.t-1]);if(v>0){w.lShiftTo(v,d);k.lShiftTo(v,g);}else{w.copyTo(d);k.copyTo(g);}var p=d.t;var b=d[p-1];if(b==0){return}var o=b*(1<<this.F1)+((p>1)?d[p-2]>>this.F2:0);var A=this.FV/o,z=(1<<this.F1)/o,x=1<<this.F2;var u=g.t,s=u-p,f=(h==null)?nbi():h;d.dlShiftTo(s,f);if(g.compareTo(f)>=0){g[g.t++]=1;g.subTo(f,g);}BigInteger.ONE.dlShiftTo(p,f);f.subTo(d,d);while(d.t<p){d[d.t++]=0;}while(--s>=0){var c=(g[--u]==b)?this.DM:Math.floor(g[u]*A+(g[u-1]+x)*z);if((g[u]+=d.am(0,c,g,s,0,p))<c){d.dlShiftTo(s,f);g.subTo(f,g);while(g[u]<--c){g.subTo(f,g);}}}if(h!=null){g.drShiftTo(p,h);if(a!=l){BigInteger.ZERO.subTo(h,h);}}g.t=p;g.clamp();if(v>0){g.rShiftTo(v,g);}if(a<0){BigInteger.ZERO.subTo(g,g);}}function bnMod(b){var c=nbi();this.abs().divRemTo(b,null,c);if(this.s<0&&c.compareTo(BigInteger.ZERO)>0){b.subTo(c,c);}return c}function Classic(a){this.m=a;}function cConvert(a){if(a.s<0||a.compareTo(this.m)>=0){return a.mod(this.m)}else{return a}}function cRevert(a){return a}function cReduce(a){a.divRemTo(this.m,null,a);}function cMulTo(a,c,b){a.multiplyTo(c,b);this.reduce(b);}function cSqrTo(a,b){a.squareTo(b);this.reduce(b);}Classic.prototype.convert=cConvert;Classic.prototype.revert=cRevert;Classic.prototype.reduce=cReduce;Classic.prototype.mulTo=cMulTo;Classic.prototype.sqrTo=cSqrTo;function bnpInvDigit(){if(this.t<1){return 0}var a=this[0];if((a&1)==0){return 0}var b=a&3;b=(b*(2-(a&15)*b))&15;b=(b*(2-(a&255)*b))&255;b=(b*(2-(((a&65535)*b)&65535)))&65535;b=(b*(2-a*b%this.DV))%this.DV;return (b>0)?this.DV-b:-b}function Montgomery(a){this.m=a;this.mp=a.invDigit();this.mpl=this.mp&32767;this.mph=this.mp>>15;this.um=(1<<(a.DB-15))-1;this.mt2=2*a.t;}function montConvert(a){var b=nbi();a.abs().dlShiftTo(this.m.t,b);b.divRemTo(this.m,null,b);if(a.s<0&&b.compareTo(BigInteger.ZERO)>0){this.m.subTo(b,b);}return b}function montRevert(a){var b=nbi();a.copyTo(b);this.reduce(b);return b}function montReduce(a){while(a.t<=this.mt2){a[a.t++]=0;}for(var c=0;c<this.m.t;++c){var b=a[c]&32767;var d=(b*this.mpl+(((b*this.mph+(a[c]>>15)*this.mpl)&this.um)<<15))&a.DM;b=c+this.m.t;a[b]+=this.m.am(0,d,a,c,0,this.m.t);while(a[b]>=a.DV){a[b]-=a.DV;a[++b]++;}}a.clamp();a.drShiftTo(this.m.t,a);if(a.compareTo(this.m)>=0){a.subTo(this.m,a);}}function montSqrTo(a,b){a.squareTo(b);this.reduce(b);}function montMulTo(a,c,b){a.multiplyTo(c,b);this.reduce(b);}Montgomery.prototype.convert=montConvert;Montgomery.prototype.revert=montRevert;Montgomery.prototype.reduce=montReduce;Montgomery.prototype.mulTo=montMulTo;Montgomery.prototype.sqrTo=montSqrTo;function bnpIsEven(){return ((this.t>0)?(this[0]&1):this.s)==0}function bnpExp(h,j){if(h>4294967295||h<1){return BigInteger.ONE}var f=nbi(),a=nbi(),d=j.convert(this),c=nbits(h)-1;d.copyTo(f);while(--c>=0){j.sqrTo(f,a);if((h&(1<<c))>0){j.mulTo(a,d,f);}else{var b=f;f=a;a=b;}}return j.revert(f)}function bnModPowInt(b,a){var c;if(b<256||a.isEven()){c=new Classic(a);}else{c=new Montgomery(a);}return this.exp(b,c)}BigInteger.prototype.copyTo=bnpCopyTo;BigInteger.prototype.fromInt=bnpFromInt;BigInteger.prototype.fromString=bnpFromString;BigInteger.prototype.clamp=bnpClamp;BigInteger.prototype.dlShiftTo=bnpDLShiftTo;BigInteger.prototype.drShiftTo=bnpDRShiftTo;BigInteger.prototype.lShiftTo=bnpLShiftTo;BigInteger.prototype.rShiftTo=bnpRShiftTo;BigInteger.prototype.subTo=bnpSubTo;BigInteger.prototype.multiplyTo=bnpMultiplyTo;BigInteger.prototype.squareTo=bnpSquareTo;BigInteger.prototype.divRemTo=bnpDivRemTo;BigInteger.prototype.invDigit=bnpInvDigit;BigInteger.prototype.isEven=bnpIsEven;BigInteger.prototype.exp=bnpExp;BigInteger.prototype.toString=bnToString;BigInteger.prototype.negate=bnNegate;BigInteger.prototype.abs=bnAbs;BigInteger.prototype.compareTo=bnCompareTo;BigInteger.prototype.bitLength=bnBitLength;BigInteger.prototype.mod=bnMod;BigInteger.prototype.modPowInt=bnModPowInt;BigInteger.ZERO=nbv(0);BigInteger.ONE=nbv(1);
    /*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
     */
    function bnClone(){var a=nbi();this.copyTo(a);return a}function bnIntValue(){if(this.s<0){if(this.t==1){return this[0]-this.DV}else{if(this.t==0){return -1}}}else{if(this.t==1){return this[0]}else{if(this.t==0){return 0}}}return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0]}function bnByteValue(){return (this.t==0)?this.s:(this[0]<<24)>>24}function bnShortValue(){return (this.t==0)?this.s:(this[0]<<16)>>16}function bnpChunkSize(a){return Math.floor(Math.LN2*this.DB/Math.log(a))}function bnSigNum(){if(this.s<0){return -1}else{if(this.t<=0||(this.t==1&&this[0]<=0)){return 0}else{return 1}}}function bnpToRadix(c){if(c==null){c=10;}if(this.signum()==0||c<2||c>36){return "0"}var f=this.chunkSize(c);var e=Math.pow(c,f);var i=nbv(e),j=nbi(),h=nbi(),g="";this.divRemTo(i,j,h);while(j.signum()>0){g=(e+h.intValue()).toString(c).substr(1)+g;j.divRemTo(i,j,h);}return h.intValue().toString(c)+g}function bnpFromRadix(m,h){this.fromInt(0);if(h==null){h=10;}var f=this.chunkSize(h);var g=Math.pow(h,f),e=false,a=0,l=0;for(var c=0;c<m.length;++c){var k=intAt(m,c);if(k<0){if(m.charAt(c)=="-"&&this.signum()==0){e=true;}continue}l=h*l+k;if(++a>=f){this.dMultiply(g);this.dAddOffset(l,0);a=0;l=0;}}if(a>0){this.dMultiply(Math.pow(h,a));this.dAddOffset(l,0);}if(e){BigInteger.ZERO.subTo(this,this);}}function bnpFromNumber(f,e,h){if("number"==typeof e){if(f<2){this.fromInt(1);}else{this.fromNumber(f,h);if(!this.testBit(f-1)){this.bitwiseTo(BigInteger.ONE.shiftLeft(f-1),op_or,this);}if(this.isEven()){this.dAddOffset(1,0);}while(!this.isProbablePrime(e)){this.dAddOffset(2,0);if(this.bitLength()>f){this.subTo(BigInteger.ONE.shiftLeft(f-1),this);}}}}else{var d=new Array(),g=f&7;d.length=(f>>3)+1;e.nextBytes(d);if(g>0){d[0]&=((1<<g)-1);}else{d[0]=0;}this.fromString(d,256);}}function bnToByteArray(){var b=this.t,c=new Array();c[0]=this.s;var e=this.DB-(b*this.DB)%8,f,a=0;if(b-->0){if(e<this.DB&&(f=this[b]>>e)!=(this.s&this.DM)>>e){c[a++]=f|(this.s<<(this.DB-e));}while(b>=0){if(e<8){f=(this[b]&((1<<e)-1))<<(8-e);f|=this[--b]>>(e+=this.DB-8);}else{f=(this[b]>>(e-=8))&255;if(e<=0){e+=this.DB;--b;}}if((f&128)!=0){f|=-256;}if(a==0&&(this.s&128)!=(f&128)){++a;}if(a>0||f!=this.s){c[a++]=f;}}}return c}function bnEquals(b){return(this.compareTo(b)==0)}function bnMin(b){return (this.compareTo(b)<0)?this:b}function bnMax(b){return (this.compareTo(b)>0)?this:b}function bnpBitwiseTo(c,h,e){var d,g,b=Math.min(c.t,this.t);for(d=0;d<b;++d){e[d]=h(this[d],c[d]);}if(c.t<this.t){g=c.s&this.DM;for(d=b;d<this.t;++d){e[d]=h(this[d],g);}e.t=this.t;}else{g=this.s&this.DM;for(d=b;d<c.t;++d){e[d]=h(g,c[d]);}e.t=c.t;}e.s=h(this.s,c.s);e.clamp();}function op_and(a,b){return a&b}function bnAnd(b){var c=nbi();this.bitwiseTo(b,op_and,c);return c}function op_or(a,b){return a|b}function bnOr(b){var c=nbi();this.bitwiseTo(b,op_or,c);return c}function op_xor(a,b){return a^b}function bnXor(b){var c=nbi();this.bitwiseTo(b,op_xor,c);return c}function op_andnot(a,b){return a&~b}function bnAndNot(b){var c=nbi();this.bitwiseTo(b,op_andnot,c);return c}function bnNot(){var b=nbi();for(var a=0;a<this.t;++a){b[a]=this.DM&~this[a];}b.t=this.t;b.s=~this.s;return b}function bnShiftLeft(b){var a=nbi();if(b<0){this.rShiftTo(-b,a);}else{this.lShiftTo(b,a);}return a}function bnShiftRight(b){var a=nbi();if(b<0){this.lShiftTo(-b,a);}else{this.rShiftTo(b,a);}return a}function lbit(a){if(a==0){return -1}var b=0;if((a&65535)==0){a>>=16;b+=16;}if((a&255)==0){a>>=8;b+=8;}if((a&15)==0){a>>=4;b+=4;}if((a&3)==0){a>>=2;b+=2;}if((a&1)==0){++b;}return b}function bnGetLowestSetBit(){for(var a=0;a<this.t;++a){if(this[a]!=0){return a*this.DB+lbit(this[a])}}if(this.s<0){return this.t*this.DB}return -1}function cbit(a){var b=0;while(a!=0){a&=a-1;++b;}return b}function bnBitCount(){var c=0,a=this.s&this.DM;for(var b=0;b<this.t;++b){c+=cbit(this[b]^a);}return c}function bnTestBit(b){var a=Math.floor(b/this.DB);if(a>=this.t){return(this.s!=0)}return((this[a]&(1<<(b%this.DB)))!=0)}function bnpChangeBit(c,b){var a=BigInteger.ONE.shiftLeft(c);this.bitwiseTo(a,b,a);return a}function bnSetBit(a){return this.changeBit(a,op_or)}function bnClearBit(a){return this.changeBit(a,op_andnot)}function bnFlipBit(a){return this.changeBit(a,op_xor)}function bnpAddTo(d,f){var e=0,g=0,b=Math.min(d.t,this.t);while(e<b){g+=this[e]+d[e];f[e++]=g&this.DM;g>>=this.DB;}if(d.t<this.t){g+=d.s;while(e<this.t){g+=this[e];f[e++]=g&this.DM;g>>=this.DB;}g+=this.s;}else{g+=this.s;while(e<d.t){g+=d[e];f[e++]=g&this.DM;g>>=this.DB;}g+=d.s;}f.s=(g<0)?-1:0;if(g>0){f[e++]=g;}else{if(g<-1){f[e++]=this.DV+g;}}f.t=e;f.clamp();}function bnAdd(b){var c=nbi();this.addTo(b,c);return c}function bnSubtract(b){var c=nbi();this.subTo(b,c);return c}function bnMultiply(b){var c=nbi();this.multiplyTo(b,c);return c}function bnSquare(){var a=nbi();this.squareTo(a);return a}function bnDivide(b){var c=nbi();this.divRemTo(b,c,null);return c}function bnRemainder(b){var c=nbi();this.divRemTo(b,null,c);return c}function bnDivideAndRemainder(b){var d=nbi(),c=nbi();this.divRemTo(b,d,c);return new Array(d,c)}function bnpDMultiply(a){this[this.t]=this.am(0,a-1,this,0,0,this.t);++this.t;this.clamp();}function bnpDAddOffset(b,a){if(b==0){return}while(this.t<=a){this[this.t++]=0;}this[a]+=b;while(this[a]>=this.DV){this[a]-=this.DV;if(++a>=this.t){this[this.t++]=0;}++this[a];}}function NullExp(){}function nNop(a){return a}function nMulTo(a,c,b){a.multiplyTo(c,b);}function nSqrTo(a,b){a.squareTo(b);}NullExp.prototype.convert=nNop;NullExp.prototype.revert=nNop;NullExp.prototype.mulTo=nMulTo;NullExp.prototype.sqrTo=nSqrTo;function bnPow(a){return this.exp(a,new NullExp())}function bnpMultiplyLowerTo(b,f,e){var d=Math.min(this.t+b.t,f);e.s=0;e.t=d;while(d>0){e[--d]=0;}var c;for(c=e.t-this.t;d<c;++d){e[d+this.t]=this.am(0,b[d],e,d,0,this.t);}for(c=Math.min(b.t,f);d<c;++d){this.am(0,b[d],e,d,0,f-d);}e.clamp();}function bnpMultiplyUpperTo(b,e,d){--e;var c=d.t=this.t+b.t-e;d.s=0;while(--c>=0){d[c]=0;}for(c=Math.max(e-this.t,0);c<b.t;++c){d[this.t+c-e]=this.am(e-c,b[c],d,0,0,this.t+c-e);}d.clamp();d.drShiftTo(1,d);}function Barrett(a){this.r2=nbi();this.q3=nbi();BigInteger.ONE.dlShiftTo(2*a.t,this.r2);this.mu=this.r2.divide(a);this.m=a;}function barrettConvert(a){if(a.s<0||a.t>2*this.m.t){return a.mod(this.m)}else{if(a.compareTo(this.m)<0){return a}else{var b=nbi();a.copyTo(b);this.reduce(b);return b}}}function barrettRevert(a){return a}function barrettReduce(a){a.drShiftTo(this.m.t-1,this.r2);if(a.t>this.m.t+1){a.t=this.m.t+1;a.clamp();}this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);while(a.compareTo(this.r2)<0){a.dAddOffset(1,this.m.t+1);}a.subTo(this.r2,a);while(a.compareTo(this.m)>=0){a.subTo(this.m,a);}}function barrettSqrTo(a,b){a.squareTo(b);this.reduce(b);}function barrettMulTo(a,c,b){a.multiplyTo(c,b);this.reduce(b);}Barrett.prototype.convert=barrettConvert;Barrett.prototype.revert=barrettRevert;Barrett.prototype.reduce=barrettReduce;Barrett.prototype.mulTo=barrettMulTo;Barrett.prototype.sqrTo=barrettSqrTo;function bnModPow(q,f){var o=q.bitLength(),h,b=nbv(1),v;if(o<=0){return b}else{if(o<18){h=1;}else{if(o<48){h=3;}else{if(o<144){h=4;}else{if(o<768){h=5;}else{h=6;}}}}}if(o<8){v=new Classic(f);}else{if(f.isEven()){v=new Barrett(f);}else{v=new Montgomery(f);}}var p=new Array(),d=3,s=h-1,a=(1<<h)-1;p[1]=v.convert(this);if(h>1){var A=nbi();v.sqrTo(p[1],A);while(d<=a){p[d]=nbi();v.mulTo(A,p[d-2],p[d]);d+=2;}}var l=q.t-1,x,u=true,c=nbi(),y;o=nbits(q[l])-1;while(l>=0){if(o>=s){x=(q[l]>>(o-s))&a;}else{x=(q[l]&((1<<(o+1))-1))<<(s-o);if(l>0){x|=q[l-1]>>(this.DB+o-s);}}d=h;while((x&1)==0){x>>=1;--d;}if((o-=d)<0){o+=this.DB;--l;}if(u){p[x].copyTo(b);u=false;}else{while(d>1){v.sqrTo(b,c);v.sqrTo(c,b);d-=2;}if(d>0){v.sqrTo(b,c);}else{y=b;b=c;c=y;}v.mulTo(c,p[x],b);}while(l>=0&&(q[l]&(1<<o))==0){v.sqrTo(b,c);y=b;b=c;c=y;if(--o<0){o=this.DB-1;--l;}}}return v.revert(b)}function bnGCD(c){var b=(this.s<0)?this.negate():this.clone();var h=(c.s<0)?c.negate():c.clone();if(b.compareTo(h)<0){var e=b;b=h;h=e;}var d=b.getLowestSetBit(),f=h.getLowestSetBit();if(f<0){return b}if(d<f){f=d;}if(f>0){b.rShiftTo(f,b);h.rShiftTo(f,h);}while(b.signum()>0){if((d=b.getLowestSetBit())>0){b.rShiftTo(d,b);}if((d=h.getLowestSetBit())>0){h.rShiftTo(d,h);}if(b.compareTo(h)>=0){b.subTo(h,b);b.rShiftTo(1,b);}else{h.subTo(b,h);h.rShiftTo(1,h);}}if(f>0){h.lShiftTo(f,h);}return h}function bnpModInt(e){if(e<=0){return 0}var c=this.DV%e,b=(this.s<0)?e-1:0;if(this.t>0){if(c==0){b=this[0]%e;}else{for(var a=this.t-1;a>=0;--a){b=(c*b+this[a])%e;}}}return b}function bnModInverse(f){var j=f.isEven();if((this.isEven()&&j)||f.signum()==0){return BigInteger.ZERO}var i=f.clone(),h=this.clone();var g=nbv(1),e=nbv(0),l=nbv(0),k=nbv(1);while(i.signum()!=0){while(i.isEven()){i.rShiftTo(1,i);if(j){if(!g.isEven()||!e.isEven()){g.addTo(this,g);e.subTo(f,e);}g.rShiftTo(1,g);}else{if(!e.isEven()){e.subTo(f,e);}}e.rShiftTo(1,e);}while(h.isEven()){h.rShiftTo(1,h);if(j){if(!l.isEven()||!k.isEven()){l.addTo(this,l);k.subTo(f,k);}l.rShiftTo(1,l);}else{if(!k.isEven()){k.subTo(f,k);}}k.rShiftTo(1,k);}if(i.compareTo(h)>=0){i.subTo(h,i);if(j){g.subTo(l,g);}e.subTo(k,e);}else{h.subTo(i,h);if(j){l.subTo(g,l);}k.subTo(e,k);}}if(h.compareTo(BigInteger.ONE)!=0){return BigInteger.ZERO}if(k.compareTo(f)>=0){return k.subtract(f)}if(k.signum()<0){k.addTo(f,k);}else{return k}if(k.signum()<0){return k.add(f)}else{return k}}var lowprimes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997];var lplim=(1<<26)/lowprimes[lowprimes.length-1];function bnIsProbablePrime(e){var d,b=this.abs();if(b.t==1&&b[0]<=lowprimes[lowprimes.length-1]){for(d=0;d<lowprimes.length;++d){if(b[0]==lowprimes[d]){return true}}return false}if(b.isEven()){return false}d=1;while(d<lowprimes.length){var a=lowprimes[d],c=d+1;while(c<lowprimes.length&&a<lplim){a*=lowprimes[c++];}a=b.modInt(a);while(d<c){if(a%lowprimes[d++]==0){return false}}}return b.millerRabin(e)}function bnpMillerRabin(f){var g=this.subtract(BigInteger.ONE);var c=g.getLowestSetBit();if(c<=0){return false}var h=g.shiftRight(c);f=(f+1)>>1;if(f>lowprimes.length){f=lowprimes.length;}var b=nbi();for(var e=0;e<f;++e){b.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);var l=b.modPow(h,this);if(l.compareTo(BigInteger.ONE)!=0&&l.compareTo(g)!=0){var d=1;while(d++<c&&l.compareTo(g)!=0){l=l.modPowInt(2,this);if(l.compareTo(BigInteger.ONE)==0){return false}}if(l.compareTo(g)!=0){return false}}}return true}BigInteger.prototype.chunkSize=bnpChunkSize;BigInteger.prototype.toRadix=bnpToRadix;BigInteger.prototype.fromRadix=bnpFromRadix;BigInteger.prototype.fromNumber=bnpFromNumber;BigInteger.prototype.bitwiseTo=bnpBitwiseTo;BigInteger.prototype.changeBit=bnpChangeBit;BigInteger.prototype.addTo=bnpAddTo;BigInteger.prototype.dMultiply=bnpDMultiply;BigInteger.prototype.dAddOffset=bnpDAddOffset;BigInteger.prototype.multiplyLowerTo=bnpMultiplyLowerTo;BigInteger.prototype.multiplyUpperTo=bnpMultiplyUpperTo;BigInteger.prototype.modInt=bnpModInt;BigInteger.prototype.millerRabin=bnpMillerRabin;BigInteger.prototype.clone=bnClone;BigInteger.prototype.intValue=bnIntValue;BigInteger.prototype.byteValue=bnByteValue;BigInteger.prototype.shortValue=bnShortValue;BigInteger.prototype.signum=bnSigNum;BigInteger.prototype.toByteArray=bnToByteArray;BigInteger.prototype.equals=bnEquals;BigInteger.prototype.min=bnMin;BigInteger.prototype.max=bnMax;BigInteger.prototype.and=bnAnd;BigInteger.prototype.or=bnOr;BigInteger.prototype.xor=bnXor;BigInteger.prototype.andNot=bnAndNot;BigInteger.prototype.not=bnNot;BigInteger.prototype.shiftLeft=bnShiftLeft;BigInteger.prototype.shiftRight=bnShiftRight;BigInteger.prototype.getLowestSetBit=bnGetLowestSetBit;BigInteger.prototype.bitCount=bnBitCount;BigInteger.prototype.testBit=bnTestBit;BigInteger.prototype.setBit=bnSetBit;BigInteger.prototype.clearBit=bnClearBit;BigInteger.prototype.flipBit=bnFlipBit;BigInteger.prototype.add=bnAdd;BigInteger.prototype.subtract=bnSubtract;BigInteger.prototype.multiply=bnMultiply;BigInteger.prototype.divide=bnDivide;BigInteger.prototype.remainder=bnRemainder;BigInteger.prototype.divideAndRemainder=bnDivideAndRemainder;BigInteger.prototype.modPow=bnModPow;BigInteger.prototype.modInverse=bnModInverse;BigInteger.prototype.pow=bnPow;BigInteger.prototype.gcd=bnGCD;BigInteger.prototype.isProbablePrime=bnIsProbablePrime;BigInteger.prototype.square=bnSquare;
    /*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
     */
    function Arcfour(){this.i=0;this.j=0;this.S=new Array();}function ARC4init(d){var c,a,b;for(c=0;c<256;++c){this.S[c]=c;}a=0;for(c=0;c<256;++c){a=(a+this.S[c]+d[c%d.length])&255;b=this.S[c];this.S[c]=this.S[a];this.S[a]=b;}this.i=0;this.j=0;}function ARC4next(){var a;this.i=(this.i+1)&255;this.j=(this.j+this.S[this.i])&255;a=this.S[this.i];this.S[this.i]=this.S[this.j];this.S[this.j]=a;return this.S[(a+this.S[this.i])&255]}Arcfour.prototype.init=ARC4init;Arcfour.prototype.next=ARC4next;function prng_newstate(){return new Arcfour()}var rng_psize=256;
    /*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
     */
    var rng_state;var rng_pool;var rng_pptr;function rng_seed_int(a){rng_pool[rng_pptr++]^=a&255;rng_pool[rng_pptr++]^=(a>>8)&255;rng_pool[rng_pptr++]^=(a>>16)&255;rng_pool[rng_pptr++]^=(a>>24)&255;if(rng_pptr>=rng_psize){rng_pptr-=rng_psize;}}function rng_seed_time(){rng_seed_int(new Date().getTime());}if(rng_pool==null){rng_pool=new Array();rng_pptr=0;var t;if(window$1!==undefined&&(window$1.msCrypto!==undefined)){var crypto$1=window$1.msCrypto;if(crypto$1.getRandomValues){var ua=new Uint8Array(32);crypto$1.getRandomValues(ua);for(t=0;t<32;++t){rng_pool[rng_pptr++]=ua[t];}}}while(rng_pptr<rng_psize){t=Math.floor(65536*Math.random());rng_pool[rng_pptr++]=t>>>8;rng_pool[rng_pptr++]=t&255;}rng_pptr=0;rng_seed_time();}function rng_get_byte(){if(rng_state==null){rng_seed_time();rng_state=prng_newstate();rng_state.init(rng_pool);for(rng_pptr=0;rng_pptr<rng_pool.length;++rng_pptr){rng_pool[rng_pptr]=0;}rng_pptr=0;}return rng_state.next()}function rng_get_bytes(b){var a;for(a=0;a<b.length;++a){b[a]=rng_get_byte();}}function SecureRandom(){}SecureRandom.prototype.nextBytes=rng_get_bytes;
    /*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
     */
    function parseBigInt(b,a){return new BigInteger(b,a)}function pkcs1pad2(e,h){if(h<e.length+11){throw "Message too long for RSA";}var g=new Array();var d=e.length-1;while(d>=0&&h>0){var f=e.charCodeAt(d--);if(f<128){g[--h]=f;}else{if((f>127)&&(f<2048)){g[--h]=(f&63)|128;g[--h]=(f>>6)|192;}else{g[--h]=(f&63)|128;g[--h]=((f>>6)&63)|128;g[--h]=(f>>12)|224;}}}g[--h]=0;var b=new SecureRandom();var a=new Array();while(h>2){a[0]=0;while(a[0]==0){b.nextBytes(a);}g[--h]=a[0];}g[--h]=2;g[--h]=0;return new BigInteger(g)}function oaep_mgf1_arr(c,a,e){var b="",d=0;while(b.length<a){b+=e(String.fromCharCode.apply(String,c.concat([(d&4278190080)>>24,(d&16711680)>>16,(d&65280)>>8,d&255])));d+=1;}return b}function oaep_pad(q,a,f,l){var c=KJUR.crypto.MessageDigest;var o=KJUR.crypto.Util;var b=null;if(!f){f="sha1";}if(typeof f==="string"){b=c.getCanonicalAlgName(f);l=c.getHashLength(b);f=function(i){return hextorstr(o.hashHex(rstrtohex(i),b))};}if(q.length+2*l+2>a){throw "Message too long for RSA"}var k="",e;for(e=0;e<a-q.length-2*l-2;e+=1){k+="\x00";}var h=f("")+k+"\x01"+q;var g=new Array(l);new SecureRandom().nextBytes(g);var j=oaep_mgf1_arr(g,h.length,f);var p=[];for(e=0;e<h.length;e+=1){p[e]=h.charCodeAt(e)^j.charCodeAt(e);}var m=oaep_mgf1_arr(p,g.length,f);var d=[0];for(e=0;e<g.length;e+=1){d[e+1]=g[e]^m.charCodeAt(e);}return new BigInteger(d.concat(p))}function RSAKey(){this.n=null;this.e=0;this.d=null;this.p=null;this.q=null;this.dmp1=null;this.dmq1=null;this.coeff=null;}function RSASetPublic(b,a){this.isPublic=true;this.isPrivate=false;if(typeof b!=="string"){this.n=b;this.e=a;}else{if(b!=null&&a!=null&&b.length>0&&a.length>0){this.n=parseBigInt(b,16);this.e=parseInt(a,16);}else{throw "Invalid RSA public key"}}}function RSADoPublic(a){return a.modPowInt(this.e,this.n)}function RSAEncrypt(d){var a=pkcs1pad2(d,(this.n.bitLength()+7)>>3);if(a==null){return null}var e=this.doPublic(a);if(e==null){return null}var b=e.toString(16);if((b.length&1)==0){return b}else{return "0"+b}}function RSAEncryptOAEP(f,e,b){var a=oaep_pad(f,(this.n.bitLength()+7)>>3,e,b);if(a==null){return null}var g=this.doPublic(a);if(g==null){return null}var d=g.toString(16);if((d.length&1)==0){return d}else{return "0"+d}}RSAKey.prototype.doPublic=RSADoPublic;RSAKey.prototype.setPublic=RSASetPublic;RSAKey.prototype.encrypt=RSAEncrypt;RSAKey.prototype.encryptOAEP=RSAEncryptOAEP;RSAKey.prototype.type="RSA";
    /*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
     */
    function ECFieldElementFp(b,a){this.x=a;this.q=b;}function feFpEquals(a){if(a==this){return true}return(this.q.equals(a.q)&&this.x.equals(a.x))}function feFpToBigInteger(){return this.x}function feFpNegate(){return new ECFieldElementFp(this.q,this.x.negate().mod(this.q))}function feFpAdd(a){return new ECFieldElementFp(this.q,this.x.add(a.toBigInteger()).mod(this.q))}function feFpSubtract(a){return new ECFieldElementFp(this.q,this.x.subtract(a.toBigInteger()).mod(this.q))}function feFpMultiply(a){return new ECFieldElementFp(this.q,this.x.multiply(a.toBigInteger()).mod(this.q))}function feFpSquare(){return new ECFieldElementFp(this.q,this.x.square().mod(this.q))}function feFpDivide(a){return new ECFieldElementFp(this.q,this.x.multiply(a.toBigInteger().modInverse(this.q)).mod(this.q))}ECFieldElementFp.prototype.equals=feFpEquals;ECFieldElementFp.prototype.toBigInteger=feFpToBigInteger;ECFieldElementFp.prototype.negate=feFpNegate;ECFieldElementFp.prototype.add=feFpAdd;ECFieldElementFp.prototype.subtract=feFpSubtract;ECFieldElementFp.prototype.multiply=feFpMultiply;ECFieldElementFp.prototype.square=feFpSquare;ECFieldElementFp.prototype.divide=feFpDivide;function ECPointFp(c,a,d,b){this.curve=c;this.x=a;this.y=d;if(b==null){this.z=BigInteger.ONE;}else{this.z=b;}this.zinv=null;}function pointFpGetX(){if(this.zinv==null){this.zinv=this.z.modInverse(this.curve.q);}return this.curve.fromBigInteger(this.x.toBigInteger().multiply(this.zinv).mod(this.curve.q))}function pointFpGetY(){if(this.zinv==null){this.zinv=this.z.modInverse(this.curve.q);}return this.curve.fromBigInteger(this.y.toBigInteger().multiply(this.zinv).mod(this.curve.q))}function pointFpEquals(a){if(a==this){return true}if(this.isInfinity()){return a.isInfinity()}if(a.isInfinity()){return this.isInfinity()}var c,b;c=a.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(a.z)).mod(this.curve.q);if(!c.equals(BigInteger.ZERO)){return false}b=a.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(a.z)).mod(this.curve.q);return b.equals(BigInteger.ZERO)}function pointFpIsInfinity(){if((this.x==null)&&(this.y==null)){return true}return this.z.equals(BigInteger.ZERO)&&!this.y.toBigInteger().equals(BigInteger.ZERO)}function pointFpNegate(){return new ECPointFp(this.curve,this.x,this.y.negate(),this.z)}function pointFpAdd(l){if(this.isInfinity()){return l}if(l.isInfinity()){return this}var p=l.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(l.z)).mod(this.curve.q);var o=l.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(l.z)).mod(this.curve.q);if(BigInteger.ZERO.equals(o)){if(BigInteger.ZERO.equals(p)){return this.twice()}return this.curve.getInfinity()}var j=new BigInteger("3");var e=this.x.toBigInteger();var n=this.y.toBigInteger();var c=l.x.toBigInteger();var k=l.y.toBigInteger();var m=o.square();var i=m.multiply(o);var d=e.multiply(m);var g=p.square().multiply(this.z);var a=g.subtract(d.shiftLeft(1)).multiply(l.z).subtract(i).multiply(o).mod(this.curve.q);var h=d.multiply(j).multiply(p).subtract(n.multiply(i)).subtract(g.multiply(p)).multiply(l.z).add(p.multiply(i)).mod(this.curve.q);var f=i.multiply(this.z).multiply(l.z).mod(this.curve.q);return new ECPointFp(this.curve,this.curve.fromBigInteger(a),this.curve.fromBigInteger(h),f)}function pointFpTwice(){if(this.isInfinity()){return this}if(this.y.toBigInteger().signum()==0){return this.curve.getInfinity()}var g=new BigInteger("3");var c=this.x.toBigInteger();var h=this.y.toBigInteger();var e=h.multiply(this.z);var j=e.multiply(h).mod(this.curve.q);var i=this.curve.a.toBigInteger();var k=c.square().multiply(g);if(!BigInteger.ZERO.equals(i)){k=k.add(this.z.square().multiply(i));}k=k.mod(this.curve.q);var b=k.square().subtract(c.shiftLeft(3).multiply(j)).shiftLeft(1).multiply(e).mod(this.curve.q);var f=k.multiply(g).multiply(c).subtract(j.shiftLeft(1)).shiftLeft(2).multiply(j).subtract(k.square().multiply(k)).mod(this.curve.q);var d=e.square().multiply(e).shiftLeft(3).mod(this.curve.q);return new ECPointFp(this.curve,this.curve.fromBigInteger(b),this.curve.fromBigInteger(f),d)}function pointFpMultiply(b){if(this.isInfinity()){return this}if(b.signum()==0){return this.curve.getInfinity()}var g=b;var f=g.multiply(new BigInteger("3"));var l=this.negate();var d=this;var c;for(c=f.bitLength()-2;c>0;--c){d=d.twice();var a=f.testBit(c);var j=g.testBit(c);if(a!=j){d=d.add(a?this:l);}}return d}function pointFpMultiplyTwo(c,a,b){var d;if(c.bitLength()>b.bitLength()){d=c.bitLength()-1;}else{d=b.bitLength()-1;}var f=this.curve.getInfinity();var e=this.add(a);while(d>=0){f=f.twice();if(c.testBit(d)){if(b.testBit(d)){f=f.add(e);}else{f=f.add(this);}}else{if(b.testBit(d)){f=f.add(a);}}--d;}return f}ECPointFp.prototype.getX=pointFpGetX;ECPointFp.prototype.getY=pointFpGetY;ECPointFp.prototype.equals=pointFpEquals;ECPointFp.prototype.isInfinity=pointFpIsInfinity;ECPointFp.prototype.negate=pointFpNegate;ECPointFp.prototype.add=pointFpAdd;ECPointFp.prototype.twice=pointFpTwice;ECPointFp.prototype.multiply=pointFpMultiply;ECPointFp.prototype.multiplyTwo=pointFpMultiplyTwo;function ECCurveFp(e,d,c){this.q=e;this.a=this.fromBigInteger(d);this.b=this.fromBigInteger(c);this.infinity=new ECPointFp(this,null,null);}function curveFpGetQ(){return this.q}function curveFpGetA(){return this.a}function curveFpGetB(){return this.b}function curveFpEquals(a){if(a==this){return true}return(this.q.equals(a.q)&&this.a.equals(a.a)&&this.b.equals(a.b))}function curveFpGetInfinity(){return this.infinity}function curveFpFromBigInteger(a){return new ECFieldElementFp(this.q,a)}function curveFpDecodePointHex(d){switch(parseInt(d.substr(0,2),16)){case 0:return this.infinity;case 2:case 3:return null;case 4:case 6:case 7:var a=(d.length-2)/2;var c=d.substr(2,a);var b=d.substr(a+2,a);return new ECPointFp(this,this.fromBigInteger(new BigInteger(c,16)),this.fromBigInteger(new BigInteger(b,16)));default:return null}}ECCurveFp.prototype.getQ=curveFpGetQ;ECCurveFp.prototype.getA=curveFpGetA;ECCurveFp.prototype.getB=curveFpGetB;ECCurveFp.prototype.equals=curveFpEquals;ECCurveFp.prototype.getInfinity=curveFpGetInfinity;ECCurveFp.prototype.fromBigInteger=curveFpFromBigInteger;ECCurveFp.prototype.decodePointHex=curveFpDecodePointHex;
    /*! (c) Stefan Thomas | https://github.com/bitcoinjs/bitcoinjs-lib
     */
    ECFieldElementFp.prototype.getByteLength=function(){return Math.floor((this.toBigInteger().bitLength()+7)/8)};ECPointFp.prototype.getEncoded=function(c){var d=function(h,f){var g=h.toByteArrayUnsigned();if(f<g.length){g=g.slice(g.length-f);}else{while(f>g.length){g.unshift(0);}}return g};var a=this.getX().toBigInteger();var e=this.getY().toBigInteger();var b=d(a,32);if(c){if(e.isEven()){b.unshift(2);}else{b.unshift(3);}}else{b.unshift(4);b=b.concat(d(e,32));}return b};ECPointFp.decodeFrom=function(g,c){var f=c[0];var e=c.length-1;var d=c.slice(1,1+e/2);var b=c.slice(1+e/2,1+e);d.unshift(0);b.unshift(0);var a=new BigInteger(d);var h=new BigInteger(b);return new ECPointFp(g,g.fromBigInteger(a),g.fromBigInteger(h))};ECPointFp.decodeFromHex=function(g,c){var f=c.substr(0,2);var e=c.length-2;var d=c.substr(2,e/2);var b=c.substr(2+e/2,e/2);var a=new BigInteger(d,16);var h=new BigInteger(b,16);return new ECPointFp(g,g.fromBigInteger(a),g.fromBigInteger(h))};ECPointFp.prototype.add2D=function(c){if(this.isInfinity()){return c}if(c.isInfinity()){return this}if(this.x.equals(c.x)){if(this.y.equals(c.y)){return this.twice()}return this.curve.getInfinity()}var g=c.x.subtract(this.x);var e=c.y.subtract(this.y);var a=e.divide(g);var d=a.square().subtract(this.x).subtract(c.x);var f=a.multiply(this.x.subtract(d)).subtract(this.y);return new ECPointFp(this.curve,d,f)};ECPointFp.prototype.twice2D=function(){if(this.isInfinity()){return this}if(this.y.toBigInteger().signum()==0){return this.curve.getInfinity()}var b=this.curve.fromBigInteger(BigInteger.valueOf(2));var e=this.curve.fromBigInteger(BigInteger.valueOf(3));var a=this.x.square().multiply(e).add(this.curve.a).divide(this.y.multiply(b));var c=a.square().subtract(this.x.multiply(b));var d=a.multiply(this.x.subtract(c)).subtract(this.y);return new ECPointFp(this.curve,c,d)};ECPointFp.prototype.multiply2D=function(b){if(this.isInfinity()){return this}if(b.signum()==0){return this.curve.getInfinity()}var g=b;var f=g.multiply(new BigInteger("3"));var l=this.negate();var d=this;var c;for(c=f.bitLength()-2;c>0;--c){d=d.twice();var a=f.testBit(c);var j=g.testBit(c);if(a!=j){d=d.add2D(a?this:l);}}return d};ECPointFp.prototype.isOnCurve=function(){var d=this.getX().toBigInteger();var i=this.getY().toBigInteger();var f=this.curve.getA().toBigInteger();var c=this.curve.getB().toBigInteger();var h=this.curve.getQ();var e=i.multiply(i).mod(h);var g=d.multiply(d).multiply(d).add(f.multiply(d)).add(c).mod(h);return e.equals(g)};ECPointFp.prototype.toString=function(){return "("+this.getX().toBigInteger().toString()+","+this.getY().toBigInteger().toString()+")"};ECPointFp.prototype.validate=function(){var c=this.curve.getQ();if(this.isInfinity()){throw new Error("Point is at infinity.")}var a=this.getX().toBigInteger();var b=this.getY().toBigInteger();if(a.compareTo(BigInteger.ONE)<0||a.compareTo(c.subtract(BigInteger.ONE))>0){throw new Error("x coordinate out of bounds")}if(b.compareTo(BigInteger.ONE)<0||b.compareTo(c.subtract(BigInteger.ONE))>0){throw new Error("y coordinate out of bounds")}if(!this.isOnCurve()){throw new Error("Point is not on the curve.")}if(this.multiply(c).isInfinity()){throw new Error("Point is not a scalar multiple of G.")}return true};
    /*! Mike Samuel (c) 2009 | code.google.com/p/json-sans-eval
     */
    var jsonParse=(function(){var e="(?:-?\\b(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\\b)";var j='(?:[^\\0-\\x08\\x0a-\\x1f"\\\\]|\\\\(?:["/\\\\bfnrt]|u[0-9A-Fa-f]{4}))';var i='(?:"'+j+'*")';var d=new RegExp("(?:false|true|null|[\\{\\}\\[\\]]|"+e+"|"+i+")","g");var k=new RegExp("\\\\(?:([^u])|u(.{4}))","g");var g={'"':'"',"/":"/","\\":"\\",b:"\b",f:"\f",n:"\n",r:"\r",t:"\t"};function h(l,m,n){return m?g[m]:String.fromCharCode(parseInt(n,16))}var c=new String("");var a="\\";var b=Object.hasOwnProperty;return function(u,q){var p=u.match(d);var x;var v=p[0];var l=false;if("{"===v){x={};}else{if("["===v){x=[];}else{x=[];l=true;}}var t;var r=[x];for(var o=1-l,m=p.length;o<m;++o){v=p[o];var w;switch(v.charCodeAt(0)){default:w=r[0];w[t||w.length]=+(v);t=void 0;break;case 34:v=v.substring(1,v.length-1);if(v.indexOf(a)!==-1){v=v.replace(k,h);}w=r[0];if(!t){if(w instanceof Array){t=w.length;}else{t=v||c;break}}w[t]=v;t=void 0;break;case 91:w=r[0];r.unshift(w[t||w.length]=[]);t=void 0;break;case 93:r.shift();break;case 102:w=r[0];w[t||w.length]=false;t=void 0;break;case 110:w=r[0];w[t||w.length]=null;t=void 0;break;case 116:w=r[0];w[t||w.length]=true;t=void 0;break;case 123:w=r[0];r.unshift(w[t||w.length]={});t=void 0;break;case 125:r.shift();break}}if(l){if(r.length!==1){throw new Error()}x=x[0];}else{if(r.length){throw new Error()}}if(q){var s=function(C,B){var D=C[B];if(D&&typeof D==="object"){var n=null;for(var z in D){if(b.call(D,z)&&D!==C){var y=s(D,z);if(y!==void 0){D[z]=y;}else{if(!n){n=[];}n.push(z);}}}if(n){for(var A=n.length;--A>=0;){delete D[n[A]];}}}return q.call(C,B,D)};x=s({"":x},"");}return x}})();
    if(typeof KJUR=="undefined"||!KJUR){KJUR={};}if(typeof KJUR.asn1=="undefined"||!KJUR.asn1){KJUR.asn1={};}KJUR.asn1.ASN1Util=new function(){this.integerToByteHex=function(a){var b=a.toString(16);if((b.length%2)==1){b="0"+b;}return b};this.bigIntToMinTwosComplementsHex=function(j){var f=j.toString(16);if(f.substr(0,1)!="-"){if(f.length%2==1){f="0"+f;}else{if(!f.match(/^[0-7]/)){f="00"+f;}}}else{var a=f.substr(1);var e=a.length;if(e%2==1){e+=1;}else{if(!f.match(/^[0-7]/)){e+=2;}}var g="";for(var d=0;d<e;d++){g+="f";}var c=new BigInteger(g,16);var b=c.xor(j).add(BigInteger.ONE);f=b.toString(16).replace(/^-/,"");}return f};this.getPEMStringFromHex=function(a,b){return hextopem(a,b)};this.newObject=function(k){var D=KJUR,n=D.asn1,z=n.DERBoolean,e=n.DERInteger,s=n.DERBitString,h=n.DEROctetString,v=n.DERNull,w=n.DERObjectIdentifier,l=n.DEREnumerated,g=n.DERUTF8String,f=n.DERNumericString,y=n.DERPrintableString,u=n.DERTeletexString,p=n.DERIA5String,C=n.DERUTCTime,j=n.DERGeneralizedTime,m=n.DERSequence,c=n.DERSet,r=n.DERTaggedObject,o=n.ASN1Util.newObject;var t=Object.keys(k);if(t.length!=1){throw "key of param shall be only one."}var F=t[0];if(":bool:int:bitstr:octstr:null:oid:enum:utf8str:numstr:prnstr:telstr:ia5str:utctime:gentime:seq:set:tag:".indexOf(":"+F+":")==-1){throw "undefined key: "+F}if(F=="bool"){return new z(k[F])}if(F=="int"){return new e(k[F])}if(F=="bitstr"){return new s(k[F])}if(F=="octstr"){return new h(k[F])}if(F=="null"){return new v(k[F])}if(F=="oid"){return new w(k[F])}if(F=="enum"){return new l(k[F])}if(F=="utf8str"){return new g(k[F])}if(F=="numstr"){return new f(k[F])}if(F=="prnstr"){return new y(k[F])}if(F=="telstr"){return new u(k[F])}if(F=="ia5str"){return new p(k[F])}if(F=="utctime"){return new C(k[F])}if(F=="gentime"){return new j(k[F])}if(F=="seq"){var d=k[F];var E=[];for(var x=0;x<d.length;x++){var B=o(d[x]);E.push(B);}return new m({array:E})}if(F=="set"){var d=k[F];var E=[];for(var x=0;x<d.length;x++){var B=o(d[x]);E.push(B);}return new c({array:E})}if(F=="tag"){var A=k[F];if(Object.prototype.toString.call(A)==="[object Array]"&&A.length==3){var q=o(A[2]);return new r({tag:A[0],explicit:A[1],obj:q})}else{var b={};if(A.explicit!==undefined){b.explicit=A.explicit;}if(A.tag!==undefined){b.tag=A.tag;}if(A.obj===undefined){throw "obj shall be specified for 'tag'."}b.obj=o(A.obj);return new r(b)}}};this.jsonToASN1HEX=function(b){var a=this.newObject(b);return a.getEncodedHex()};};KJUR.asn1.ASN1Util.oidHexToInt=function(a){var j="";var k=parseInt(a.substr(0,2),16);var d=Math.floor(k/40);var c=k%40;var j=d+"."+c;var e="";for(var f=2;f<a.length;f+=2){var g=parseInt(a.substr(f,2),16);var h=("00000000"+g.toString(2)).slice(-8);e=e+h.substr(1,7);if(h.substr(0,1)=="0"){var b=new BigInteger(e,2);j=j+"."+b.toString(10);e="";}}return j};KJUR.asn1.ASN1Util.oidIntToHex=function(f){var e=function(a){var k=a.toString(16);if(k.length==1){k="0"+k;}return k};var d=function(o){var n="";var k=new BigInteger(o,10);var a=k.toString(2);var l=7-a.length%7;if(l==7){l=0;}var q="";for(var m=0;m<l;m++){q+="0";}a=q+a;for(var m=0;m<a.length-1;m+=7){var p=a.substr(m,7);if(m!=a.length-7){p="1"+p;}n+=e(parseInt(p,2));}return n};if(!f.match(/^[0-9.]+$/)){throw "malformed oid string: "+f}var g="";var b=f.split(".");var j=parseInt(b[0])*40+parseInt(b[1]);g+=e(j);b.splice(0,2);for(var c=0;c<b.length;c++){g+=d(b[c]);}return g};KJUR.asn1.ASN1Object=function(){var a="";this.getLengthHexFromValue=function(){if(typeof this.hV=="undefined"||this.hV==null){throw "this.hV is null or undefined."}if(this.hV.length%2==1){throw "value hex must be even length: n="+a.length+",v="+this.hV}var i=this.hV.length/2;var h=i.toString(16);if(h.length%2==1){h="0"+h;}if(i<128){return h}else{var g=h.length/2;if(g>15){throw "ASN.1 length too long to represent by 8x: n = "+i.toString(16)}var f=128+g;return f.toString(16)+h}};this.getEncodedHex=function(){if(this.hTLV==null||this.isModified){this.hV=this.getFreshValueHex();this.hL=this.getLengthHexFromValue();this.hTLV=this.hT+this.hL+this.hV;this.isModified=false;}return this.hTLV};this.getValueHex=function(){this.getEncodedHex();return this.hV};this.getFreshValueHex=function(){return ""};};KJUR.asn1.DERAbstractString=function(c){KJUR.asn1.DERAbstractString.superclass.constructor.call(this);this.getString=function(){return this.s};this.setString=function(d){this.hTLV=null;this.isModified=true;this.s=d;this.hV=utf8tohex(this.s).toLowerCase();};this.setStringHex=function(d){this.hTLV=null;this.isModified=true;this.s=null;this.hV=d;};this.getFreshValueHex=function(){return this.hV};if(typeof c!="undefined"){if(typeof c=="string"){this.setString(c);}else{if(typeof c.str!="undefined"){this.setString(c.str);}else{if(typeof c.hex!="undefined"){this.setStringHex(c.hex);}}}}};YAHOO.lang.extend(KJUR.asn1.DERAbstractString,KJUR.asn1.ASN1Object);KJUR.asn1.DERAbstractTime=function(c){KJUR.asn1.DERAbstractTime.superclass.constructor.call(this);this.localDateToUTC=function(f){utc=f.getTime()+(f.getTimezoneOffset()*60000);var e=new Date(utc);return e};this.formatDate=function(m,o,e){var g=this.zeroPadding;var n=this.localDateToUTC(m);var p=String(n.getFullYear());if(o=="utc"){p=p.substr(2,2);}var l=g(String(n.getMonth()+1),2);var q=g(String(n.getDate()),2);var h=g(String(n.getHours()),2);var i=g(String(n.getMinutes()),2);var j=g(String(n.getSeconds()),2);var r=p+l+q+h+i+j;if(e===true){var f=n.getMilliseconds();if(f!=0){var k=g(String(f),3);k=k.replace(/[0]+$/,"");r=r+"."+k;}}return r+"Z"};this.zeroPadding=function(e,d){if(e.length>=d){return e}return new Array(d-e.length+1).join("0")+e};this.getString=function(){return this.s};this.setString=function(d){this.hTLV=null;this.isModified=true;this.s=d;this.hV=stohex(d);};this.setByDateValue=function(h,j,e,d,f,g){var i=new Date(Date.UTC(h,j-1,e,d,f,g,0));this.setByDate(i);};this.getFreshValueHex=function(){return this.hV};};YAHOO.lang.extend(KJUR.asn1.DERAbstractTime,KJUR.asn1.ASN1Object);KJUR.asn1.DERAbstractStructured=function(b){KJUR.asn1.DERAbstractString.superclass.constructor.call(this);this.setByASN1ObjectArray=function(c){this.hTLV=null;this.isModified=true;this.asn1Array=c;};this.appendASN1Object=function(c){this.hTLV=null;this.isModified=true;this.asn1Array.push(c);};this.asn1Array=new Array();if(typeof b!="undefined"){if(typeof b.array!="undefined"){this.asn1Array=b.array;}}};YAHOO.lang.extend(KJUR.asn1.DERAbstractStructured,KJUR.asn1.ASN1Object);KJUR.asn1.DERBoolean=function(){KJUR.asn1.DERBoolean.superclass.constructor.call(this);this.hT="01";this.hTLV="0101ff";};YAHOO.lang.extend(KJUR.asn1.DERBoolean,KJUR.asn1.ASN1Object);KJUR.asn1.DERInteger=function(a){KJUR.asn1.DERInteger.superclass.constructor.call(this);this.hT="02";this.setByBigInteger=function(b){this.hTLV=null;this.isModified=true;this.hV=KJUR.asn1.ASN1Util.bigIntToMinTwosComplementsHex(b);};this.setByInteger=function(c){var b=new BigInteger(String(c),10);this.setByBigInteger(b);};this.setValueHex=function(b){this.hV=b;};this.getFreshValueHex=function(){return this.hV};if(typeof a!="undefined"){if(typeof a.bigint!="undefined"){this.setByBigInteger(a.bigint);}else{if(typeof a["int"]!="undefined"){this.setByInteger(a["int"]);}else{if(typeof a=="number"){this.setByInteger(a);}else{if(typeof a.hex!="undefined"){this.setValueHex(a.hex);}}}}}};YAHOO.lang.extend(KJUR.asn1.DERInteger,KJUR.asn1.ASN1Object);KJUR.asn1.DERBitString=function(b){if(b!==undefined&&typeof b.obj!=="undefined"){var a=KJUR.asn1.ASN1Util.newObject(b.obj);b.hex="00"+a.getEncodedHex();}KJUR.asn1.DERBitString.superclass.constructor.call(this);this.hT="03";this.setHexValueIncludingUnusedBits=function(c){this.hTLV=null;this.isModified=true;this.hV=c;};this.setUnusedBitsAndHexValue=function(c,e){if(c<0||7<c){throw "unused bits shall be from 0 to 7: u = "+c}var d="0"+c;this.hTLV=null;this.isModified=true;this.hV=d+e;};this.setByBinaryString=function(e){e=e.replace(/0+$/,"");var f=8-e.length%8;if(f==8){f=0;}for(var g=0;g<=f;g++){e+="0";}var j="";for(var g=0;g<e.length-1;g+=8){var d=e.substr(g,8);var c=parseInt(d,2).toString(16);if(c.length==1){c="0"+c;}j+=c;}this.hTLV=null;this.isModified=true;this.hV="0"+f+j;};this.setByBooleanArray=function(e){var d="";for(var c=0;c<e.length;c++){if(e[c]==true){d+="1";}else{d+="0";}}this.setByBinaryString(d);};this.newFalseArray=function(e){var c=new Array(e);for(var d=0;d<e;d++){c[d]=false;}return c};this.getFreshValueHex=function(){return this.hV};if(typeof b!="undefined"){if(typeof b=="string"&&b.toLowerCase().match(/^[0-9a-f]+$/)){this.setHexValueIncludingUnusedBits(b);}else{if(typeof b.hex!="undefined"){this.setHexValueIncludingUnusedBits(b.hex);}else{if(typeof b.bin!="undefined"){this.setByBinaryString(b.bin);}else{if(typeof b.array!="undefined"){this.setByBooleanArray(b.array);}}}}}};YAHOO.lang.extend(KJUR.asn1.DERBitString,KJUR.asn1.ASN1Object);KJUR.asn1.DEROctetString=function(b){if(b!==undefined&&typeof b.obj!=="undefined"){var a=KJUR.asn1.ASN1Util.newObject(b.obj);b.hex=a.getEncodedHex();}KJUR.asn1.DEROctetString.superclass.constructor.call(this,b);this.hT="04";};YAHOO.lang.extend(KJUR.asn1.DEROctetString,KJUR.asn1.DERAbstractString);KJUR.asn1.DERNull=function(){KJUR.asn1.DERNull.superclass.constructor.call(this);this.hT="05";this.hTLV="0500";};YAHOO.lang.extend(KJUR.asn1.DERNull,KJUR.asn1.ASN1Object);KJUR.asn1.DERObjectIdentifier=function(c){var b=function(d){var e=d.toString(16);if(e.length==1){e="0"+e;}return e};var a=function(k){var j="";var e=new BigInteger(k,10);var d=e.toString(2);var f=7-d.length%7;if(f==7){f=0;}var m="";for(var g=0;g<f;g++){m+="0";}d=m+d;for(var g=0;g<d.length-1;g+=7){var l=d.substr(g,7);if(g!=d.length-7){l="1"+l;}j+=b(parseInt(l,2));}return j};KJUR.asn1.DERObjectIdentifier.superclass.constructor.call(this);this.hT="06";this.setValueHex=function(d){this.hTLV=null;this.isModified=true;this.s=null;this.hV=d;};this.setValueOidString=function(f){if(!f.match(/^[0-9.]+$/)){throw "malformed oid string: "+f}var g="";var d=f.split(".");var j=parseInt(d[0])*40+parseInt(d[1]);g+=b(j);d.splice(0,2);for(var e=0;e<d.length;e++){g+=a(d[e]);}this.hTLV=null;this.isModified=true;this.s=null;this.hV=g;};this.setValueName=function(e){var d=KJUR.asn1.x509.OID.name2oid(e);if(d!==""){this.setValueOidString(d);}else{throw "DERObjectIdentifier oidName undefined: "+e}};this.getFreshValueHex=function(){return this.hV};if(c!==undefined){if(typeof c==="string"){if(c.match(/^[0-2].[0-9.]+$/)){this.setValueOidString(c);}else{this.setValueName(c);}}else{if(c.oid!==undefined){this.setValueOidString(c.oid);}else{if(c.hex!==undefined){this.setValueHex(c.hex);}else{if(c.name!==undefined){this.setValueName(c.name);}}}}}};YAHOO.lang.extend(KJUR.asn1.DERObjectIdentifier,KJUR.asn1.ASN1Object);KJUR.asn1.DEREnumerated=function(a){KJUR.asn1.DEREnumerated.superclass.constructor.call(this);this.hT="0a";this.setByBigInteger=function(b){this.hTLV=null;this.isModified=true;this.hV=KJUR.asn1.ASN1Util.bigIntToMinTwosComplementsHex(b);};this.setByInteger=function(c){var b=new BigInteger(String(c),10);this.setByBigInteger(b);};this.setValueHex=function(b){this.hV=b;};this.getFreshValueHex=function(){return this.hV};if(typeof a!="undefined"){if(typeof a["int"]!="undefined"){this.setByInteger(a["int"]);}else{if(typeof a=="number"){this.setByInteger(a);}else{if(typeof a.hex!="undefined"){this.setValueHex(a.hex);}}}}};YAHOO.lang.extend(KJUR.asn1.DEREnumerated,KJUR.asn1.ASN1Object);KJUR.asn1.DERUTF8String=function(a){KJUR.asn1.DERUTF8String.superclass.constructor.call(this,a);this.hT="0c";};YAHOO.lang.extend(KJUR.asn1.DERUTF8String,KJUR.asn1.DERAbstractString);KJUR.asn1.DERNumericString=function(a){KJUR.asn1.DERNumericString.superclass.constructor.call(this,a);this.hT="12";};YAHOO.lang.extend(KJUR.asn1.DERNumericString,KJUR.asn1.DERAbstractString);KJUR.asn1.DERPrintableString=function(a){KJUR.asn1.DERPrintableString.superclass.constructor.call(this,a);this.hT="13";};YAHOO.lang.extend(KJUR.asn1.DERPrintableString,KJUR.asn1.DERAbstractString);KJUR.asn1.DERTeletexString=function(a){KJUR.asn1.DERTeletexString.superclass.constructor.call(this,a);this.hT="14";};YAHOO.lang.extend(KJUR.asn1.DERTeletexString,KJUR.asn1.DERAbstractString);KJUR.asn1.DERIA5String=function(a){KJUR.asn1.DERIA5String.superclass.constructor.call(this,a);this.hT="16";};YAHOO.lang.extend(KJUR.asn1.DERIA5String,KJUR.asn1.DERAbstractString);KJUR.asn1.DERUTCTime=function(a){KJUR.asn1.DERUTCTime.superclass.constructor.call(this,a);this.hT="17";this.setByDate=function(b){this.hTLV=null;this.isModified=true;this.date=b;this.s=this.formatDate(this.date,"utc");this.hV=stohex(this.s);};this.getFreshValueHex=function(){if(typeof this.date=="undefined"&&typeof this.s=="undefined"){this.date=new Date();this.s=this.formatDate(this.date,"utc");this.hV=stohex(this.s);}return this.hV};if(a!==undefined){if(a.str!==undefined){this.setString(a.str);}else{if(typeof a=="string"&&a.match(/^[0-9]{12}Z$/)){this.setString(a);}else{if(a.hex!==undefined){this.setStringHex(a.hex);}else{if(a.date!==undefined){this.setByDate(a.date);}}}}}};YAHOO.lang.extend(KJUR.asn1.DERUTCTime,KJUR.asn1.DERAbstractTime);KJUR.asn1.DERGeneralizedTime=function(a){KJUR.asn1.DERGeneralizedTime.superclass.constructor.call(this,a);this.hT="18";this.withMillis=false;this.setByDate=function(b){this.hTLV=null;this.isModified=true;this.date=b;this.s=this.formatDate(this.date,"gen",this.withMillis);this.hV=stohex(this.s);};this.getFreshValueHex=function(){if(this.date===undefined&&this.s===undefined){this.date=new Date();this.s=this.formatDate(this.date,"gen",this.withMillis);this.hV=stohex(this.s);}return this.hV};if(a!==undefined){if(a.str!==undefined){this.setString(a.str);}else{if(typeof a=="string"&&a.match(/^[0-9]{14}Z$/)){this.setString(a);}else{if(a.hex!==undefined){this.setStringHex(a.hex);}else{if(a.date!==undefined){this.setByDate(a.date);}}}}if(a.millis===true){this.withMillis=true;}}};YAHOO.lang.extend(KJUR.asn1.DERGeneralizedTime,KJUR.asn1.DERAbstractTime);KJUR.asn1.DERSequence=function(a){KJUR.asn1.DERSequence.superclass.constructor.call(this,a);this.hT="30";this.getFreshValueHex=function(){var c="";for(var b=0;b<this.asn1Array.length;b++){var d=this.asn1Array[b];c+=d.getEncodedHex();}this.hV=c;return this.hV};};YAHOO.lang.extend(KJUR.asn1.DERSequence,KJUR.asn1.DERAbstractStructured);KJUR.asn1.DERSet=function(a){KJUR.asn1.DERSet.superclass.constructor.call(this,a);this.hT="31";this.sortFlag=true;this.getFreshValueHex=function(){var b=new Array();for(var c=0;c<this.asn1Array.length;c++){var d=this.asn1Array[c];b.push(d.getEncodedHex());}if(this.sortFlag==true){b.sort();}this.hV=b.join("");return this.hV};if(typeof a!="undefined"){if(typeof a.sortflag!="undefined"&&a.sortflag==false){this.sortFlag=false;}}};YAHOO.lang.extend(KJUR.asn1.DERSet,KJUR.asn1.DERAbstractStructured);KJUR.asn1.DERTaggedObject=function(a){KJUR.asn1.DERTaggedObject.superclass.constructor.call(this);this.hT="a0";this.hV="";this.isExplicit=true;this.asn1Object=null;this.setASN1Object=function(b,c,d){this.hT=c;this.isExplicit=b;this.asn1Object=d;if(this.isExplicit){this.hV=this.asn1Object.getEncodedHex();this.hTLV=null;this.isModified=true;}else{this.hV=null;this.hTLV=d.getEncodedHex();this.hTLV=this.hTLV.replace(/^../,c);this.isModified=false;}};this.getFreshValueHex=function(){return this.hV};if(typeof a!="undefined"){if(typeof a.tag!="undefined"){this.hT=a.tag;}if(typeof a.explicit!="undefined"){this.isExplicit=a.explicit;}if(typeof a.obj!="undefined"){this.asn1Object=a.obj;this.setASN1Object(this.isExplicit,this.hT,this.asn1Object);}}};YAHOO.lang.extend(KJUR.asn1.DERTaggedObject,KJUR.asn1.ASN1Object);
    var ASN1HEX=new function(){};ASN1HEX.getLblen=function(c,a){if(c.substr(a+2,1)!="8"){return 1}var b=parseInt(c.substr(a+3,1));if(b==0){return -1}if(0<b&&b<10){return b+1}return -2};ASN1HEX.getL=function(c,b){var a=ASN1HEX.getLblen(c,b);if(a<1){return ""}return c.substr(b+2,a*2)};ASN1HEX.getVblen=function(d,a){var c,b;c=ASN1HEX.getL(d,a);if(c==""){return -1}if(c.substr(0,1)==="8"){b=new BigInteger(c.substr(2),16);}else{b=new BigInteger(c,16);}return b.intValue()};ASN1HEX.getVidx=function(c,b){var a=ASN1HEX.getLblen(c,b);if(a<0){return a}return b+(a+1)*2};ASN1HEX.getV=function(d,a){var c=ASN1HEX.getVidx(d,a);var b=ASN1HEX.getVblen(d,a);return d.substr(c,b*2)};ASN1HEX.getTLV=function(b,a){return b.substr(a,2)+ASN1HEX.getL(b,a)+ASN1HEX.getV(b,a)};ASN1HEX.getNextSiblingIdx=function(d,a){var c=ASN1HEX.getVidx(d,a);var b=ASN1HEX.getVblen(d,a);return c+b*2};ASN1HEX.getChildIdx=function(e,f){var j=ASN1HEX;var g=new Array();var i=j.getVidx(e,f);if(e.substr(f,2)=="03"){g.push(i+2);}else{g.push(i);}var l=j.getVblen(e,f);var c=i;var d=0;while(1){var b=j.getNextSiblingIdx(e,c);if(b==null||(b-i>=(l*2))){break}if(d>=200){break}g.push(b);c=b;d++;}return g};ASN1HEX.getNthChildIdx=function(d,b,e){var c=ASN1HEX.getChildIdx(d,b);return c[e]};ASN1HEX.getIdxbyList=function(e,d,c,i){var g=ASN1HEX;var f,b;if(c.length==0){if(i!==undefined){if(e.substr(d,2)!==i){throw "checking tag doesn't match: "+e.substr(d,2)+"!="+i}}return d}f=c.shift();b=g.getChildIdx(e,d);return g.getIdxbyList(e,b[f],c,i)};ASN1HEX.getTLVbyList=function(d,c,b,f){var e=ASN1HEX;var a=e.getIdxbyList(d,c,b);if(a===undefined){throw "can't find nthList object"}if(f!==undefined){if(d.substr(a,2)!=f){throw "checking tag doesn't match: "+d.substr(a,2)+"!="+f}}return e.getTLV(d,a)};ASN1HEX.getVbyList=function(e,c,b,g,i){var f=ASN1HEX;var a,d;a=f.getIdxbyList(e,c,b,g);if(a===undefined){throw "can't find nthList object"}d=f.getV(e,a);if(i===true){d=d.substr(2);}return d};ASN1HEX.hextooidstr=function(e){var h=function(b,a){if(b.length>=a){return b}return new Array(a-b.length+1).join("0")+b};var l=[];var o=e.substr(0,2);var f=parseInt(o,16);l[0]=new String(Math.floor(f/40));l[1]=new String(f%40);var m=e.substr(2);var k=[];for(var g=0;g<m.length/2;g++){k.push(parseInt(m.substr(g*2,2),16));}var j=[];var d="";for(var g=0;g<k.length;g++){if(k[g]&128){d=d+h((k[g]&127).toString(2),7);}else{d=d+h((k[g]&127).toString(2),7);j.push(new String(parseInt(d,2)));d="";}}var n=l.join(".");if(j.length>0){n=n+"."+j.join(".");}return n};ASN1HEX.dump=function(t,c,l,g){var p=ASN1HEX;var j=p.getV;var y=p.dump;var w=p.getChildIdx;var e=t;if(t instanceof KJUR.asn1.ASN1Object){e=t.getEncodedHex();}var q=function(A,i){if(A.length<=i*2){return A}else{var v=A.substr(0,i)+"..(total "+A.length/2+"bytes).."+A.substr(A.length-i,i);return v}};if(c===undefined){c={ommit_long_octet:32};}if(l===undefined){l=0;}if(g===undefined){g="";}var x=c.ommit_long_octet;if(e.substr(l,2)=="01"){var h=j(e,l);if(h=="00"){return g+"BOOLEAN FALSE\n"}else{return g+"BOOLEAN TRUE\n"}}if(e.substr(l,2)=="02"){var h=j(e,l);return g+"INTEGER "+q(h,x)+"\n"}if(e.substr(l,2)=="03"){var h=j(e,l);return g+"BITSTRING "+q(h,x)+"\n"}if(e.substr(l,2)=="04"){var h=j(e,l);if(p.isASN1HEX(h)){var k=g+"OCTETSTRING, encapsulates\n";k=k+y(h,c,0,g+"  ");return k}else{return g+"OCTETSTRING "+q(h,x)+"\n"}}if(e.substr(l,2)=="05"){return g+"NULL\n"}if(e.substr(l,2)=="06"){var m=j(e,l);var a=KJUR.asn1.ASN1Util.oidHexToInt(m);var o=KJUR.asn1.x509.OID.oid2name(a);var b=a.replace(/\./g," ");if(o!=""){return g+"ObjectIdentifier "+o+" ("+b+")\n"}else{return g+"ObjectIdentifier ("+b+")\n"}}if(e.substr(l,2)=="0c"){return g+"UTF8String '"+hextoutf8(j(e,l))+"'\n"}if(e.substr(l,2)=="13"){return g+"PrintableString '"+hextoutf8(j(e,l))+"'\n"}if(e.substr(l,2)=="14"){return g+"TeletexString '"+hextoutf8(j(e,l))+"'\n"}if(e.substr(l,2)=="16"){return g+"IA5String '"+hextoutf8(j(e,l))+"'\n"}if(e.substr(l,2)=="17"){return g+"UTCTime "+hextoutf8(j(e,l))+"\n"}if(e.substr(l,2)=="18"){return g+"GeneralizedTime "+hextoutf8(j(e,l))+"\n"}if(e.substr(l,2)=="30"){if(e.substr(l,4)=="3000"){return g+"SEQUENCE {}\n"}var k=g+"SEQUENCE\n";var d=w(e,l);var f=c;if((d.length==2||d.length==3)&&e.substr(d[0],2)=="06"&&e.substr(d[d.length-1],2)=="04"){var o=p.oidname(j(e,d[0]));var r=JSON.parse(JSON.stringify(c));r.x509ExtName=o;f=r;}for(var u=0;u<d.length;u++){k=k+y(e,f,d[u],g+"  ");}return k}if(e.substr(l,2)=="31"){var k=g+"SET\n";var d=w(e,l);for(var u=0;u<d.length;u++){k=k+y(e,c,d[u],g+"  ");}return k}var z=parseInt(e.substr(l,2),16);if((z&128)!=0){var n=z&31;if((z&32)!=0){var k=g+"["+n+"]\n";var d=w(e,l);for(var u=0;u<d.length;u++){k=k+y(e,c,d[u],g+"  ");}return k}else{var h=j(e,l);if(h.substr(0,8)=="68747470"){h=hextoutf8(h);}if(c.x509ExtName==="subjectAltName"&&n==2){h=hextoutf8(h);}var k=g+"["+n+"] "+h+"\n";return k}}return g+"UNKNOWN("+e.substr(l,2)+") "+j(e,l)+"\n"};ASN1HEX.isASN1HEX=function(e){var d=ASN1HEX;if(e.length%2==1){return false}var c=d.getVblen(e,0);var b=e.substr(0,2);var f=d.getL(e,0);var a=e.length-b.length-f.length;if(a==c*2){return true}return false};ASN1HEX.oidname=function(a){var c=KJUR.asn1;if(KJUR.lang.String.isHex(a)){a=c.ASN1Util.oidHexToInt(a);}var b=c.x509.OID.oid2name(a);if(b===""){b=a;}return b};
    var KJUR;if(typeof KJUR=="undefined"||!KJUR){KJUR={};}if(typeof KJUR.lang=="undefined"||!KJUR.lang){KJUR.lang={};}KJUR.lang.String=function(){};function stoBA(d){var b=new Array();for(var c=0;c<d.length;c++){b[c]=d.charCodeAt(c);}return b}function BAtohex(b){var e="";for(var d=0;d<b.length;d++){var c=b[d].toString(16);if(c.length==1){c="0"+c;}e=e+c;}return e}function stohex(a){return BAtohex(stoBA(a))}function b64tob64u(a){a=a.replace(/\=/g,"");a=a.replace(/\+/g,"-");a=a.replace(/\//g,"_");return a}function b64utob64(a){if(a.length%4==2){a=a+"==";}else{if(a.length%4==3){a=a+"=";}}a=a.replace(/-/g,"+");a=a.replace(/_/g,"/");return a}function hextob64u(a){if(a.length%2==1){a="0"+a;}return b64tob64u(hex2b64(a))}function b64utohex(a){return b64tohex(b64utob64(a))}var utf8tob64u,b64utoutf8;if(typeof Buffer==="function"){utf8tob64u=function(a){return b64tob64u(new Buffer(a,"utf8").toString("base64"))};b64utoutf8=function(a){return new Buffer(b64utob64(a),"base64").toString("utf8")};}else{utf8tob64u=function(a){return hextob64u(uricmptohex(encodeURIComponentAll(a)))};b64utoutf8=function(a){return decodeURIComponent(hextouricmp(b64utohex(a)))};}function utf8tohex(a){return uricmptohex(encodeURIComponentAll(a))}function hextoutf8(a){return decodeURIComponent(hextouricmp(a))}function hextorstr(c){var b="";for(var a=0;a<c.length-1;a+=2){b+=String.fromCharCode(parseInt(c.substr(a,2),16));}return b}function rstrtohex(c){var a="";for(var b=0;b<c.length;b++){a+=("0"+c.charCodeAt(b).toString(16)).slice(-2);}return a}function hextob64(a){return hex2b64(a)}function hextob64nl(b){var a=hextob64(b);var c=a.replace(/(.{64})/g,"$1\r\n");c=c.replace(/\r\n$/,"");return c}function b64nltohex(b){var a=b.replace(/[^0-9A-Za-z\/+=]*/g,"");var c=b64tohex(a);return c}function hextopem(a,b){var c=hextob64nl(a);return "-----BEGIN "+b+"-----\r\n"+c+"\r\n-----END "+b+"-----\r\n"}function pemtohex(a,b){if(a.indexOf("-----BEGIN ")==-1){throw "can't find PEM header: "+b}if(b!==undefined){a=a.replace("-----BEGIN "+b+"-----","");a=a.replace("-----END "+b+"-----","");}else{a=a.replace(/-----BEGIN [^-]+-----/,"");a=a.replace(/-----END [^-]+-----/,"");}return b64nltohex(a)}function zulutomsec(n){var l,j,m,e,f,i,b;var a,h,g,c;c=n.match(/^(\d{2}|\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(|\.\d+)Z$/);if(c){a=c[1];l=parseInt(a);if(a.length===2){if(50<=l&&l<100){l=1900+l;}else{if(0<=l&&l<50){l=2000+l;}}}j=parseInt(c[2])-1;m=parseInt(c[3]);e=parseInt(c[4]);f=parseInt(c[5]);i=parseInt(c[6]);b=0;h=c[7];if(h!==""){g=(h.substr(1)+"00").substr(0,3);b=parseInt(g);}return Date.UTC(l,j,m,e,f,i,b)}throw "unsupported zulu format: "+n}function zulutosec(a){var b=zulutomsec(a);return ~~(b/1000)}function uricmptohex(a){return a.replace(/%/g,"")}function hextouricmp(a){return a.replace(/(..)/g,"%$1")}function hextoipv6(e){if(!e.match(/^[0-9A-Fa-f]{32}$/)){throw "malformed IPv6 address octet"}e=e.toLowerCase();var b=e.match(/.{1,4}/g);for(var d=0;d<8;d++){b[d]=b[d].replace(/^0+/,"");if(b[d]==""){b[d]="0";}}e=":"+b.join(":")+":";var c=e.match(/:(0:){2,}/g);if(c===null){return e.slice(1,-1)}var f="";for(var d=0;d<c.length;d++){if(c[d].length>f.length){f=c[d];}}e=e.replace(f,"::");return e.slice(1,-1)}function hextoip(b){var d="malformed hex value";if(!b.match(/^([0-9A-Fa-f][0-9A-Fa-f]){1,}$/)){throw d}if(b.length==8){var c;try{c=parseInt(b.substr(0,2),16)+"."+parseInt(b.substr(2,2),16)+"."+parseInt(b.substr(4,2),16)+"."+parseInt(b.substr(6,2),16);return c}catch(a){throw d}}else{if(b.length==32){return hextoipv6(b)}else{return b}}}function encodeURIComponentAll(a){var d=encodeURIComponent(a);var b="";for(var c=0;c<d.length;c++){if(d[c]=="%"){b=b+d.substr(c,3);c=c+2;}else{b=b+"%"+stohex(d[c]);}}return b}KJUR.lang.String.isInteger=function(a){if(a.match(/^[0-9]+$/)){return true}else{if(a.match(/^-[0-9]+$/)){return true}else{return false}}};KJUR.lang.String.isHex=function(a){if(a.length%2==0&&(a.match(/^[0-9a-f]+$/)||a.match(/^[0-9A-F]+$/))){return true}else{return false}};KJUR.lang.String.isBase64=function(a){a=a.replace(/\s+/g,"");if(a.match(/^[0-9A-Za-z+\/]+={0,3}$/)&&a.length%4==0){return true}else{return false}};KJUR.lang.String.isBase64URL=function(a){if(a.match(/[+/=]/)){return false}a=b64utob64(a);return KJUR.lang.String.isBase64(a)};KJUR.lang.String.isIntegerArray=function(a){a=a.replace(/\s+/g,"");if(a.match(/^\[[0-9,]+\]$/)){return true}else{return false}};function hextoposhex(a){if(a.length%2==1){return "0"+a}if(a.substr(0,1)>"7"){return "00"+a}return a}if(typeof KJUR=="undefined"||!KJUR){KJUR={};}if(typeof KJUR.crypto=="undefined"||!KJUR.crypto){KJUR.crypto={};}KJUR.crypto.Util=new function(){this.DIGESTINFOHEAD={sha1:"3021300906052b0e03021a05000414",sha224:"302d300d06096086480165030402040500041c",sha256:"3031300d060960864801650304020105000420",sha384:"3041300d060960864801650304020205000430",sha512:"3051300d060960864801650304020305000440",md2:"3020300c06082a864886f70d020205000410",md5:"3020300c06082a864886f70d020505000410",ripemd160:"3021300906052b2403020105000414",};this.DEFAULTPROVIDER={md5:"cryptojs",sha1:"cryptojs",sha224:"cryptojs",sha256:"cryptojs",sha384:"cryptojs",sha512:"cryptojs",ripemd160:"cryptojs",hmacmd5:"cryptojs",hmacsha1:"cryptojs",hmacsha224:"cryptojs",hmacsha256:"cryptojs",hmacsha384:"cryptojs",hmacsha512:"cryptojs",hmacripemd160:"cryptojs",MD5withRSA:"cryptojs/jsrsa",SHA1withRSA:"cryptojs/jsrsa",SHA224withRSA:"cryptojs/jsrsa",SHA256withRSA:"cryptojs/jsrsa",SHA384withRSA:"cryptojs/jsrsa",SHA512withRSA:"cryptojs/jsrsa",RIPEMD160withRSA:"cryptojs/jsrsa",MD5withECDSA:"cryptojs/jsrsa",SHA1withECDSA:"cryptojs/jsrsa",SHA224withECDSA:"cryptojs/jsrsa",SHA256withECDSA:"cryptojs/jsrsa",SHA384withECDSA:"cryptojs/jsrsa",SHA512withECDSA:"cryptojs/jsrsa",RIPEMD160withECDSA:"cryptojs/jsrsa",SHA1withDSA:"cryptojs/jsrsa",SHA224withDSA:"cryptojs/jsrsa",SHA256withDSA:"cryptojs/jsrsa",MD5withRSAandMGF1:"cryptojs/jsrsa",SHA1withRSAandMGF1:"cryptojs/jsrsa",SHA224withRSAandMGF1:"cryptojs/jsrsa",SHA256withRSAandMGF1:"cryptojs/jsrsa",SHA384withRSAandMGF1:"cryptojs/jsrsa",SHA512withRSAandMGF1:"cryptojs/jsrsa",RIPEMD160withRSAandMGF1:"cryptojs/jsrsa",};this.CRYPTOJSMESSAGEDIGESTNAME={md5:CryptoJS.algo.MD5,sha1:CryptoJS.algo.SHA1,sha224:CryptoJS.algo.SHA224,sha256:CryptoJS.algo.SHA256,sha384:CryptoJS.algo.SHA384,sha512:CryptoJS.algo.SHA512,ripemd160:CryptoJS.algo.RIPEMD160};this.getDigestInfoHex=function(a,b){if(typeof this.DIGESTINFOHEAD[b]=="undefined"){throw "alg not supported in Util.DIGESTINFOHEAD: "+b}return this.DIGESTINFOHEAD[b]+a};this.getPaddedDigestInfoHex=function(h,a,j){var c=this.getDigestInfoHex(h,a);var d=j/4;if(c.length+22>d){throw "key is too short for SigAlg: keylen="+j+","+a}var b="0001";var k="00"+c;var g="";var l=d-b.length-k.length;for(var f=0;f<l;f+=2){g+="ff";}var e=b+g+k;return e};this.hashString=function(a,c){var b=new KJUR.crypto.MessageDigest({alg:c});return b.digestString(a)};this.hashHex=function(b,c){var a=new KJUR.crypto.MessageDigest({alg:c});return a.digestHex(b)};this.sha1=function(a){var b=new KJUR.crypto.MessageDigest({alg:"sha1",prov:"cryptojs"});return b.digestString(a)};this.sha256=function(a){var b=new KJUR.crypto.MessageDigest({alg:"sha256",prov:"cryptojs"});return b.digestString(a)};this.sha256Hex=function(a){var b=new KJUR.crypto.MessageDigest({alg:"sha256",prov:"cryptojs"});return b.digestHex(a)};this.sha512=function(a){var b=new KJUR.crypto.MessageDigest({alg:"sha512",prov:"cryptojs"});return b.digestString(a)};this.sha512Hex=function(a){var b=new KJUR.crypto.MessageDigest({alg:"sha512",prov:"cryptojs"});return b.digestHex(a)};};KJUR.crypto.Util.md5=function(a){var b=new KJUR.crypto.MessageDigest({alg:"md5",prov:"cryptojs"});return b.digestString(a)};KJUR.crypto.Util.ripemd160=function(a){var b=new KJUR.crypto.MessageDigest({alg:"ripemd160",prov:"cryptojs"});return b.digestString(a)};KJUR.crypto.Util.SECURERANDOMGEN=new SecureRandom();KJUR.crypto.Util.getRandomHexOfNbytes=function(b){var a=new Array(b);KJUR.crypto.Util.SECURERANDOMGEN.nextBytes(a);return BAtohex(a)};KJUR.crypto.Util.getRandomBigIntegerOfNbytes=function(a){return new BigInteger(KJUR.crypto.Util.getRandomHexOfNbytes(a),16)};KJUR.crypto.Util.getRandomHexOfNbits=function(d){var c=d%8;var a=(d-c)/8;var b=new Array(a+1);KJUR.crypto.Util.SECURERANDOMGEN.nextBytes(b);b[0]=(((255<<c)&255)^255)&b[0];return BAtohex(b)};KJUR.crypto.Util.getRandomBigIntegerOfNbits=function(a){return new BigInteger(KJUR.crypto.Util.getRandomHexOfNbits(a),16)};KJUR.crypto.Util.getRandomBigIntegerZeroToMax=function(b){var a=b.bitLength();while(1){var c=KJUR.crypto.Util.getRandomBigIntegerOfNbits(a);if(b.compareTo(c)!=-1){return c}}};KJUR.crypto.Util.getRandomBigIntegerMinToMax=function(e,b){var c=e.compareTo(b);if(c==1){throw "biMin is greater than biMax"}if(c==0){return e}var a=b.subtract(e);var d=KJUR.crypto.Util.getRandomBigIntegerZeroToMax(a);return d.add(e)};KJUR.crypto.MessageDigest=function(c){this.setAlgAndProvider=function(g,f){g=KJUR.crypto.MessageDigest.getCanonicalAlgName(g);if(g!==null&&f===undefined){f=KJUR.crypto.Util.DEFAULTPROVIDER[g];}if(":md5:sha1:sha224:sha256:sha384:sha512:ripemd160:".indexOf(g)!=-1&&f=="cryptojs"){try{this.md=KJUR.crypto.Util.CRYPTOJSMESSAGEDIGESTNAME[g].create();}catch(e){throw "setAlgAndProvider hash alg set fail alg="+g+"/"+e}this.updateString=function(h){this.md.update(h);};this.updateHex=function(h){var i=CryptoJS.enc.Hex.parse(h);this.md.update(i);};this.digest=function(){var h=this.md.finalize();return h.toString(CryptoJS.enc.Hex)};this.digestString=function(h){this.updateString(h);return this.digest()};this.digestHex=function(h){this.updateHex(h);return this.digest()};}if(":sha256:".indexOf(g)!=-1&&f=="sjcl"){try{this.md=new sjcl.hash.sha256();}catch(e){throw "setAlgAndProvider hash alg set fail alg="+g+"/"+e}this.updateString=function(h){this.md.update(h);};this.updateHex=function(i){var h=sjcl.codec.hex.toBits(i);this.md.update(h);};this.digest=function(){var h=this.md.finalize();return sjcl.codec.hex.fromBits(h)};this.digestString=function(h){this.updateString(h);return this.digest()};this.digestHex=function(h){this.updateHex(h);return this.digest()};}};this.updateString=function(e){throw "updateString(str) not supported for this alg/prov: "+this.algName+"/"+this.provName};this.updateHex=function(e){throw "updateHex(hex) not supported for this alg/prov: "+this.algName+"/"+this.provName};this.digest=function(){throw "digest() not supported for this alg/prov: "+this.algName+"/"+this.provName};this.digestString=function(e){throw "digestString(str) not supported for this alg/prov: "+this.algName+"/"+this.provName};this.digestHex=function(e){throw "digestHex(hex) not supported for this alg/prov: "+this.algName+"/"+this.provName};if(c!==undefined){if(c.alg!==undefined){this.algName=c.alg;if(c.prov===undefined){this.provName=KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];}this.setAlgAndProvider(this.algName,this.provName);}}};KJUR.crypto.MessageDigest.getCanonicalAlgName=function(a){if(typeof a==="string"){a=a.toLowerCase();a=a.replace(/-/,"");}return a};KJUR.crypto.MessageDigest.getHashLength=function(c){var b=KJUR.crypto.MessageDigest;var a=b.getCanonicalAlgName(c);if(b.HASHLENGTH[a]===undefined){throw "not supported algorithm: "+c}return b.HASHLENGTH[a]};KJUR.crypto.MessageDigest.HASHLENGTH={md5:16,sha1:20,sha224:28,sha256:32,sha384:48,sha512:64,ripemd160:20};KJUR.crypto.Mac=function(d){this.setAlgAndProvider=function(k,i){k=k.toLowerCase();if(k==null){k="hmacsha1";}k=k.toLowerCase();if(k.substr(0,4)!="hmac"){throw "setAlgAndProvider unsupported HMAC alg: "+k}if(i===undefined){i=KJUR.crypto.Util.DEFAULTPROVIDER[k];}this.algProv=k+"/"+i;var g=k.substr(4);if(":md5:sha1:sha224:sha256:sha384:sha512:ripemd160:".indexOf(g)!=-1&&i=="cryptojs"){try{var j=KJUR.crypto.Util.CRYPTOJSMESSAGEDIGESTNAME[g];this.mac=CryptoJS.algo.HMAC.create(j,this.pass);}catch(h){throw "setAlgAndProvider hash alg set fail hashAlg="+g+"/"+h}this.updateString=function(l){this.mac.update(l);};this.updateHex=function(l){var m=CryptoJS.enc.Hex.parse(l);this.mac.update(m);};this.doFinal=function(){var l=this.mac.finalize();return l.toString(CryptoJS.enc.Hex)};this.doFinalString=function(l){this.updateString(l);return this.doFinal()};this.doFinalHex=function(l){this.updateHex(l);return this.doFinal()};}};this.updateString=function(g){throw "updateString(str) not supported for this alg/prov: "+this.algProv};this.updateHex=function(g){throw "updateHex(hex) not supported for this alg/prov: "+this.algProv};this.doFinal=function(){throw "digest() not supported for this alg/prov: "+this.algProv};this.doFinalString=function(g){throw "digestString(str) not supported for this alg/prov: "+this.algProv};this.doFinalHex=function(g){throw "digestHex(hex) not supported for this alg/prov: "+this.algProv};this.setPassword=function(h){if(typeof h=="string"){var g=h;if(h.length%2==1||!h.match(/^[0-9A-Fa-f]+$/)){g=rstrtohex(h);}this.pass=CryptoJS.enc.Hex.parse(g);return}if(typeof h!="object"){throw "KJUR.crypto.Mac unsupported password type: "+h}var g=null;if(h.hex!==undefined){if(h.hex.length%2!=0||!h.hex.match(/^[0-9A-Fa-f]+$/)){throw "Mac: wrong hex password: "+h.hex}g=h.hex;}if(h.utf8!==undefined){g=utf8tohex(h.utf8);}if(h.rstr!==undefined){g=rstrtohex(h.rstr);}if(h.b64!==undefined){g=b64tohex(h.b64);}if(h.b64u!==undefined){g=b64utohex(h.b64u);}if(g==null){throw "KJUR.crypto.Mac unsupported password type: "+h}this.pass=CryptoJS.enc.Hex.parse(g);};if(d!==undefined){if(d.pass!==undefined){this.setPassword(d.pass);}if(d.alg!==undefined){this.algName=d.alg;if(d.prov===undefined){this.provName=KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];}this.setAlgAndProvider(this.algName,this.provName);}}};KJUR.crypto.Signature=function(o){var q=null;this._setAlgNames=function(){var s=this.algName.match(/^(.+)with(.+)$/);if(s){this.mdAlgName=s[1].toLowerCase();this.pubkeyAlgName=s[2].toLowerCase();}};this._zeroPaddingOfSignature=function(x,w){var v="";var t=w/4-x.length;for(var u=0;u<t;u++){v=v+"0";}return v+x};this.setAlgAndProvider=function(u,t){this._setAlgNames();if(t!="cryptojs/jsrsa"){throw "provider not supported: "+t}if(":md5:sha1:sha224:sha256:sha384:sha512:ripemd160:".indexOf(this.mdAlgName)!=-1){try{this.md=new KJUR.crypto.MessageDigest({alg:this.mdAlgName});}catch(s){throw "setAlgAndProvider hash alg set fail alg="+this.mdAlgName+"/"+s}this.init=function(w,x){var y=null;try{if(x===undefined){y=KEYUTIL.getKey(w);}else{y=KEYUTIL.getKey(w,x);}}catch(v){throw "init failed:"+v}if(y.isPrivate===true){this.prvKey=y;this.state="SIGN";}else{if(y.isPublic===true){this.pubKey=y;this.state="VERIFY";}else{throw "init failed.:"+y}}};this.updateString=function(v){this.md.updateString(v);};this.updateHex=function(v){this.md.updateHex(v);};this.sign=function(){this.sHashHex=this.md.digest();if(typeof this.ecprvhex!="undefined"&&typeof this.eccurvename!="undefined"){var v=new KJUR.crypto.ECDSA({curve:this.eccurvename});this.hSign=v.signHex(this.sHashHex,this.ecprvhex);}else{if(this.prvKey instanceof RSAKey&&this.pubkeyAlgName==="rsaandmgf1"){this.hSign=this.prvKey.signWithMessageHashPSS(this.sHashHex,this.mdAlgName,this.pssSaltLen);}else{if(this.prvKey instanceof RSAKey&&this.pubkeyAlgName==="rsa"){this.hSign=this.prvKey.signWithMessageHash(this.sHashHex,this.mdAlgName);}else{if(this.prvKey instanceof KJUR.crypto.ECDSA){this.hSign=this.prvKey.signWithMessageHash(this.sHashHex);}else{if(this.prvKey instanceof KJUR.crypto.DSA){this.hSign=this.prvKey.signWithMessageHash(this.sHashHex);}else{throw "Signature: unsupported private key alg: "+this.pubkeyAlgName}}}}}return this.hSign};this.signString=function(v){this.updateString(v);return this.sign()};this.signHex=function(v){this.updateHex(v);return this.sign()};this.verify=function(v){this.sHashHex=this.md.digest();if(typeof this.ecpubhex!="undefined"&&typeof this.eccurvename!="undefined"){var w=new KJUR.crypto.ECDSA({curve:this.eccurvename});return w.verifyHex(this.sHashHex,v,this.ecpubhex)}else{if(this.pubKey instanceof RSAKey&&this.pubkeyAlgName==="rsaandmgf1"){return this.pubKey.verifyWithMessageHashPSS(this.sHashHex,v,this.mdAlgName,this.pssSaltLen)}else{if(this.pubKey instanceof RSAKey&&this.pubkeyAlgName==="rsa"){return this.pubKey.verifyWithMessageHash(this.sHashHex,v)}else{if(KJUR.crypto.ECDSA!==undefined&&this.pubKey instanceof KJUR.crypto.ECDSA){return this.pubKey.verifyWithMessageHash(this.sHashHex,v)}else{if(KJUR.crypto.DSA!==undefined&&this.pubKey instanceof KJUR.crypto.DSA){return this.pubKey.verifyWithMessageHash(this.sHashHex,v)}else{throw "Signature: unsupported public key alg: "+this.pubkeyAlgName}}}}}};}};this.init=function(s,t){throw "init(key, pass) not supported for this alg:prov="+this.algProvName};this.updateString=function(s){throw "updateString(str) not supported for this alg:prov="+this.algProvName};this.updateHex=function(s){throw "updateHex(hex) not supported for this alg:prov="+this.algProvName};this.sign=function(){throw "sign() not supported for this alg:prov="+this.algProvName};this.signString=function(s){throw "digestString(str) not supported for this alg:prov="+this.algProvName};this.signHex=function(s){throw "digestHex(hex) not supported for this alg:prov="+this.algProvName};this.verify=function(s){throw "verify(hSigVal) not supported for this alg:prov="+this.algProvName};this.initParams=o;if(o!==undefined){if(o.alg!==undefined){this.algName=o.alg;if(o.prov===undefined){this.provName=KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];}else{this.provName=o.prov;}this.algProvName=this.algName+":"+this.provName;this.setAlgAndProvider(this.algName,this.provName);this._setAlgNames();}if(o.psssaltlen!==undefined){this.pssSaltLen=o.psssaltlen;}if(o.prvkeypem!==undefined){if(o.prvkeypas!==undefined){throw "both prvkeypem and prvkeypas parameters not supported"}else{try{var q=KEYUTIL.getKey(o.prvkeypem);this.init(q);}catch(m){throw "fatal error to load pem private key: "+m}}}}};KJUR.crypto.Cipher=function(a){};KJUR.crypto.Cipher.encrypt=function(e,f,d){if(f instanceof RSAKey&&f.isPublic){var c=KJUR.crypto.Cipher.getAlgByKeyAndName(f,d);if(c==="RSA"){return f.encrypt(e)}if(c==="RSAOAEP"){return f.encryptOAEP(e,"sha1")}var b=c.match(/^RSAOAEP(\d+)$/);if(b!==null){return f.encryptOAEP(e,"sha"+b[1])}throw "Cipher.encrypt: unsupported algorithm for RSAKey: "+d}else{throw "Cipher.encrypt: unsupported key or algorithm"}};KJUR.crypto.Cipher.decrypt=function(e,f,d){if(f instanceof RSAKey&&f.isPrivate){var c=KJUR.crypto.Cipher.getAlgByKeyAndName(f,d);if(c==="RSA"){return f.decrypt(e)}if(c==="RSAOAEP"){return f.decryptOAEP(e,"sha1")}var b=c.match(/^RSAOAEP(\d+)$/);if(b!==null){return f.decryptOAEP(e,"sha"+b[1])}throw "Cipher.decrypt: unsupported algorithm for RSAKey: "+d}else{throw "Cipher.decrypt: unsupported key or algorithm"}};KJUR.crypto.Cipher.getAlgByKeyAndName=function(b,a){if(b instanceof RSAKey){if(":RSA:RSAOAEP:RSAOAEP224:RSAOAEP256:RSAOAEP384:RSAOAEP512:".indexOf(a)!=-1){return a}if(a===null||a===undefined){return "RSA"}throw "getAlgByKeyAndName: not supported algorithm name for RSAKey: "+a}throw "getAlgByKeyAndName: not supported algorithm name: "+a};KJUR.crypto.OID=new function(){this.oidhex2name={"2a864886f70d010101":"rsaEncryption","2a8648ce3d0201":"ecPublicKey","2a8648ce380401":"dsa","2a8648ce3d030107":"secp256r1","2b8104001f":"secp192k1","2b81040021":"secp224r1","2b8104000a":"secp256k1","2b81040023":"secp521r1","2b81040022":"secp384r1","2a8648ce380403":"SHA1withDSA","608648016503040301":"SHA224withDSA","608648016503040302":"SHA256withDSA",};};
    if(typeof KJUR=="undefined"||!KJUR){KJUR={};}if(typeof KJUR.crypto=="undefined"||!KJUR.crypto){KJUR.crypto={};}KJUR.crypto.ECDSA=function(h){var e="secp256r1";var a=new SecureRandom();this.type="EC";this.isPrivate=false;this.isPublic=false;this.getBigRandom=function(i){return new BigInteger(i.bitLength(),a).mod(i.subtract(BigInteger.ONE)).add(BigInteger.ONE)};this.setNamedCurve=function(i){this.ecparams=KJUR.crypto.ECParameterDB.getByName(i);this.prvKeyHex=null;this.pubKeyHex=null;this.curveName=i;};this.setPrivateKeyHex=function(i){this.isPrivate=true;this.prvKeyHex=i;};this.setPublicKeyHex=function(i){this.isPublic=true;this.pubKeyHex=i;};this.getPublicKeyXYHex=function(){var k=this.pubKeyHex;if(k.substr(0,2)!=="04"){throw "this method supports uncompressed format(04) only"}var j=this.ecparams.keylen/4;if(k.length!==2+j*2){throw "malformed public key hex length"}var i={};i.x=k.substr(2,j);i.y=k.substr(2+j);return i};this.getShortNISTPCurveName=function(){var i=this.curveName;if(i==="secp256r1"||i==="NIST P-256"||i==="P-256"||i==="prime256v1"){return "P-256"}if(i==="secp384r1"||i==="NIST P-384"||i==="P-384"){return "P-384"}return null};this.generateKeyPairHex=function(){var k=this.ecparams.n;var n=this.getBigRandom(k);var l=this.ecparams.G.multiply(n);var q=l.getX().toBigInteger();var o=l.getY().toBigInteger();var i=this.ecparams.keylen/4;var m=("0000000000"+n.toString(16)).slice(-i);var r=("0000000000"+q.toString(16)).slice(-i);var p=("0000000000"+o.toString(16)).slice(-i);var j="04"+r+p;this.setPrivateKeyHex(m);this.setPublicKeyHex(j);return {ecprvhex:m,ecpubhex:j}};this.signWithMessageHash=function(i){return this.signHex(i,this.prvKeyHex)};this.signHex=function(o,j){var t=new BigInteger(j,16);var l=this.ecparams.n;var q=new BigInteger(o,16);do{var m=this.getBigRandom(l);var u=this.ecparams.G;var p=u.multiply(m);var i=p.getX().toBigInteger().mod(l);}while(i.compareTo(BigInteger.ZERO)<=0);var v=m.modInverse(l).multiply(q.add(t.multiply(i))).mod(l);return KJUR.crypto.ECDSA.biRSSigToASN1Sig(i,v)};this.sign=function(m,u){var q=u;var j=this.ecparams.n;var p=BigInteger.fromByteArrayUnsigned(m);do{var l=this.getBigRandom(j);var t=this.ecparams.G;var o=t.multiply(l);var i=o.getX().toBigInteger().mod(j);}while(i.compareTo(BigInteger.ZERO)<=0);var v=l.modInverse(j).multiply(p.add(q.multiply(i))).mod(j);return this.serializeSig(i,v)};this.verifyWithMessageHash=function(j,i){return this.verifyHex(j,i,this.pubKeyHex)};this.verifyHex=function(m,i,p){var l,j;var o=KJUR.crypto.ECDSA.parseSigHex(i);l=o.r;j=o.s;var k;k=ECPointFp.decodeFromHex(this.ecparams.curve,p);var n=new BigInteger(m,16);return this.verifyRaw(n,l,j,k)};this.verify=function(o,p,j){var l,i;if(Bitcoin.Util.isArray(p)){var n=this.parseSig(p);l=n.r;i=n.s;}else{if("object"===typeof p&&p.r&&p.s){l=p.r;i=p.s;}else{throw "Invalid value for signature"}}var k;if(j instanceof ECPointFp){k=j;}else{if(Bitcoin.Util.isArray(j)){k=ECPointFp.decodeFrom(this.ecparams.curve,j);}else{throw "Invalid format for pubkey value, must be byte array or ECPointFp"}}var m=BigInteger.fromByteArrayUnsigned(o);return this.verifyRaw(m,l,i,k)};this.verifyRaw=function(o,i,w,m){var l=this.ecparams.n;var u=this.ecparams.G;if(i.compareTo(BigInteger.ONE)<0||i.compareTo(l)>=0){return false}if(w.compareTo(BigInteger.ONE)<0||w.compareTo(l)>=0){return false}var p=w.modInverse(l);var k=o.multiply(p).mod(l);var j=i.multiply(p).mod(l);var q=u.multiply(k).add(m.multiply(j));var t=q.getX().toBigInteger().mod(l);return t.equals(i)};this.serializeSig=function(k,j){var l=k.toByteArraySigned();var i=j.toByteArraySigned();var m=[];m.push(2);m.push(l.length);m=m.concat(l);m.push(2);m.push(i.length);m=m.concat(i);m.unshift(m.length);m.unshift(48);return m};this.parseSig=function(n){var m;if(n[0]!=48){throw new Error("Signature not a valid DERSequence")}m=2;if(n[m]!=2){throw new Error("First element in signature must be a DERInteger")}var l=n.slice(m+2,m+2+n[m+1]);m+=2+n[m+1];if(n[m]!=2){throw new Error("Second element in signature must be a DERInteger")}var i=n.slice(m+2,m+2+n[m+1]);m+=2+n[m+1];var k=BigInteger.fromByteArrayUnsigned(l);var j=BigInteger.fromByteArrayUnsigned(i);return {r:k,s:j}};this.parseSigCompact=function(m){if(m.length!==65){throw "Signature has the wrong length"}var j=m[0]-27;if(j<0||j>7){throw "Invalid signature type"}var o=this.ecparams.n;var l=BigInteger.fromByteArrayUnsigned(m.slice(1,33)).mod(o);var k=BigInteger.fromByteArrayUnsigned(m.slice(33,65)).mod(o);return {r:l,s:k,i:j}};this.readPKCS5PrvKeyHex=function(l){var n=ASN1HEX;var m=KJUR.crypto.ECDSA.getName;var p=n.getVbyList;if(n.isASN1HEX(l)===false){throw "not ASN.1 hex string"}var i,k,o;try{i=p(l,0,[2,0],"06");k=p(l,0,[1],"04");try{o=p(l,0,[3,0],"03").substr(2);}catch(j){}}catch(j){throw "malformed PKCS#1/5 plain ECC private key"}this.curveName=m(i);if(this.curveName===undefined){throw "unsupported curve name"}this.setNamedCurve(this.curveName);this.setPublicKeyHex(o);this.setPrivateKeyHex(k);this.isPublic=false;};this.readPKCS8PrvKeyHex=function(l){var q=ASN1HEX;var i=KJUR.crypto.ECDSA.getName;var n=q.getVbyList;if(q.isASN1HEX(l)===false){throw "not ASN.1 hex string"}var j,p,m,k;try{j=n(l,0,[1,0],"06");p=n(l,0,[1,1],"06");m=n(l,0,[2,0,1],"04");try{k=n(l,0,[2,0,2,0],"03").substr(2);}catch(o){}}catch(o){throw "malformed PKCS#8 plain ECC private key"}this.curveName=i(p);if(this.curveName===undefined){throw "unsupported curve name"}this.setNamedCurve(this.curveName);this.setPublicKeyHex(k);this.setPrivateKeyHex(m);this.isPublic=false;};this.readPKCS8PubKeyHex=function(l){var n=ASN1HEX;var m=KJUR.crypto.ECDSA.getName;var p=n.getVbyList;if(n.isASN1HEX(l)===false){throw "not ASN.1 hex string"}var k,i,o;try{k=p(l,0,[0,0],"06");i=p(l,0,[0,1],"06");o=p(l,0,[1],"03").substr(2);}catch(j){throw "malformed PKCS#8 ECC public key"}this.curveName=m(i);if(this.curveName===null){throw "unsupported curve name"}this.setNamedCurve(this.curveName);this.setPublicKeyHex(o);};this.readCertPubKeyHex=function(k,p){if(p!==5){p=6;}var m=ASN1HEX;var l=KJUR.crypto.ECDSA.getName;var o=m.getVbyList;if(m.isASN1HEX(k)===false){throw "not ASN.1 hex string"}var i,n;try{i=o(k,0,[0,p,0,1],"06");n=o(k,0,[0,p,1],"03").substr(2);}catch(j){throw "malformed X.509 certificate ECC public key"}this.curveName=l(i);if(this.curveName===null){throw "unsupported curve name"}this.setNamedCurve(this.curveName);this.setPublicKeyHex(n);};if(h!==undefined){if(h.curve!==undefined){this.curveName=h.curve;}}if(this.curveName===undefined){this.curveName=e;}this.setNamedCurve(this.curveName);if(h!==undefined){if(h.prv!==undefined){this.setPrivateKeyHex(h.prv);}if(h.pub!==undefined){this.setPublicKeyHex(h.pub);}}};KJUR.crypto.ECDSA.parseSigHex=function(a){var b=KJUR.crypto.ECDSA.parseSigHexInHexRS(a);var d=new BigInteger(b.r,16);var c=new BigInteger(b.s,16);return {r:d,s:c}};KJUR.crypto.ECDSA.parseSigHexInHexRS=function(f){var j=ASN1HEX;var i=j.getChildIdx;var g=j.getV;if(f.substr(0,2)!="30"){throw "signature is not a ASN.1 sequence"}var h=i(f,0);if(h.length!=2){throw "number of signature ASN.1 sequence elements seem wrong"}var e=h[0];var d=h[1];if(f.substr(e,2)!="02"){throw "1st item of sequene of signature is not ASN.1 integer"}if(f.substr(d,2)!="02"){throw "2nd item of sequene of signature is not ASN.1 integer"}var c=g(f,e);var b=g(f,d);return {r:c,s:b}};KJUR.crypto.ECDSA.asn1SigToConcatSig=function(c){var d=KJUR.crypto.ECDSA.parseSigHexInHexRS(c);var b=d.r;var a=d.s;if(b.substr(0,2)=="00"&&(b.length%32)==2){b=b.substr(2);}if(a.substr(0,2)=="00"&&(a.length%32)==2){a=a.substr(2);}if((b.length%32)==30){b="00"+b;}if((a.length%32)==30){a="00"+a;}if(b.length%32!=0){throw "unknown ECDSA sig r length error"}if(a.length%32!=0){throw "unknown ECDSA sig s length error"}return b+a};KJUR.crypto.ECDSA.concatSigToASN1Sig=function(a){if((((a.length/2)*8)%(16*8))!=0){throw "unknown ECDSA concatinated r-s sig  length error"}var c=a.substr(0,a.length/2);var b=a.substr(a.length/2);return KJUR.crypto.ECDSA.hexRSSigToASN1Sig(c,b)};KJUR.crypto.ECDSA.hexRSSigToASN1Sig=function(b,a){var d=new BigInteger(b,16);var c=new BigInteger(a,16);return KJUR.crypto.ECDSA.biRSSigToASN1Sig(d,c)};KJUR.crypto.ECDSA.biRSSigToASN1Sig=function(f,d){var c=KJUR.asn1;var b=new c.DERInteger({bigint:f});var a=new c.DERInteger({bigint:d});var e=new c.DERSequence({array:[b,a]});return e.getEncodedHex()};KJUR.crypto.ECDSA.getName=function(a){if(a==="2a8648ce3d030107"){return "secp256r1"}if(a==="2b8104000a"){return "secp256k1"}if(a==="2b81040022"){return "secp384r1"}if("|secp256r1|NIST P-256|P-256|prime256v1|".indexOf(a)!==-1){return "secp256r1"}if("|secp256k1|".indexOf(a)!==-1){return "secp256k1"}if("|secp384r1|NIST P-384|P-384|".indexOf(a)!==-1){return "secp384r1"}return null};
    if(typeof KJUR=="undefined"||!KJUR){KJUR={};}if(typeof KJUR.crypto=="undefined"||!KJUR.crypto){KJUR.crypto={};}KJUR.crypto.ECParameterDB=new function(){var b={};var c={};function a(d){return new BigInteger(d,16)}this.getByName=function(e){var d=e;if(typeof c[d]!="undefined"){d=c[e];}if(typeof b[d]!="undefined"){return b[d]}throw "unregistered EC curve name: "+d};this.regist=function(A,l,o,g,m,e,j,f,k,u,d,x){b[A]={};var s=a(o);var z=a(g);var y=a(m);var t=a(e);var w=a(j);var r=new ECCurveFp(s,z,y);var q=r.decodePointHex("04"+f+k);b[A]["name"]=A;b[A]["keylen"]=l;b[A]["curve"]=r;b[A]["G"]=q;b[A]["n"]=t;b[A]["h"]=w;b[A]["oid"]=d;b[A]["info"]=x;for(var v=0;v<u.length;v++){c[u[v]]=A;}};};KJUR.crypto.ECParameterDB.regist("secp128r1",128,"FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFF","FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFC","E87579C11079F43DD824993C2CEE5ED3","FFFFFFFE0000000075A30D1B9038A115","1","161FF7528B899B2D0C28607CA52C5B86","CF5AC8395BAFEB13C02DA292DDED7A83",[],"","secp128r1 : SECG curve over a 128 bit prime field");KJUR.crypto.ECParameterDB.regist("secp160k1",160,"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFAC73","0","7","0100000000000000000001B8FA16DFAB9ACA16B6B3","1","3B4C382CE37AA192A4019E763036F4F5DD4D7EBB","938CF935318FDCED6BC28286531733C3F03C4FEE",[],"","secp160k1 : SECG curve over a 160 bit prime field");KJUR.crypto.ECParameterDB.regist("secp160r1",160,"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFF","FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFC","1C97BEFC54BD7A8B65ACF89F81D4D4ADC565FA45","0100000000000000000001F4C8F927AED3CA752257","1","4A96B5688EF573284664698968C38BB913CBFC82","23A628553168947D59DCC912042351377AC5FB32",[],"","secp160r1 : SECG curve over a 160 bit prime field");KJUR.crypto.ECParameterDB.regist("secp192k1",192,"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFEE37","0","3","FFFFFFFFFFFFFFFFFFFFFFFE26F2FC170F69466A74DEFD8D","1","DB4FF10EC057E9AE26B07D0280B7F4341DA5D1B1EAE06C7D","9B2F2F6D9C5628A7844163D015BE86344082AA88D95E2F9D",[]);KJUR.crypto.ECParameterDB.regist("secp192r1",192,"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFF","FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFC","64210519E59C80E70FA7E9AB72243049FEB8DEECC146B9B1","FFFFFFFFFFFFFFFFFFFFFFFF99DEF836146BC9B1B4D22831","1","188DA80EB03090F67CBF20EB43A18800F4FF0AFD82FF1012","07192B95FFC8DA78631011ED6B24CDD573F977A11E794811",[]);KJUR.crypto.ECParameterDB.regist("secp224r1",224,"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000001","FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFE","B4050A850C04B3ABF54132565044B0B7D7BFD8BA270B39432355FFB4","FFFFFFFFFFFFFFFFFFFFFFFFFFFF16A2E0B8F03E13DD29455C5C2A3D","1","B70E0CBD6BB4BF7F321390B94A03C1D356C21122343280D6115C1D21","BD376388B5F723FB4C22DFE6CD4375A05A07476444D5819985007E34",[]);KJUR.crypto.ECParameterDB.regist("secp256k1",256,"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F","0","7","FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141","1","79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798","483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8",[]);KJUR.crypto.ECParameterDB.regist("secp256r1",256,"FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF","FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC","5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B","FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551","1","6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296","4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5",["NIST P-256","P-256","prime256v1"]);KJUR.crypto.ECParameterDB.regist("secp384r1",384,"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFF","FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFC","B3312FA7E23EE7E4988E056BE3F82D19181D9C6EFE8141120314088F5013875AC656398D8A2ED19D2A85C8EDD3EC2AEF","FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC7634D81F4372DDF581A0DB248B0A77AECEC196ACCC52973","1","AA87CA22BE8B05378EB1C71EF320AD746E1D3B628BA79B9859F741E082542A385502F25DBF55296C3A545E3872760AB7","3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f",["NIST P-384","P-384"]);KJUR.crypto.ECParameterDB.regist("secp521r1",521,"1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF","1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC","051953EB9618E1C9A1F929A21A0B68540EEA2DA725B99B315F3B8B489918EF109E156193951EC7E937B1652C0BD3BB1BF073573DF883D2C34F1EF451FD46B503F00","1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409","1","C6858E06B70404E9CD9E3ECB662395B4429C648139053FB521F828AF606B4D3DBAA14B5E77EFE75928FE1DC127A2FFA8DE3348B3C1856A429BF97E7E31C2E5BD66","011839296a789a3bc0045c8a5fb42c7d1bd998f54449579b446817afbd17273e662c97ee72995ef42640c550b9013fad0761353c7086a272c24088be94769fd16650",["NIST P-521","P-521"]);
    var KEYUTIL=function(){var d=function(p,r,q){return k(CryptoJS.AES,p,r,q)};var e=function(p,r,q){return k(CryptoJS.TripleDES,p,r,q)};var a=function(p,r,q){return k(CryptoJS.DES,p,r,q)};var k=function(s,x,u,q){var r=CryptoJS.enc.Hex.parse(x);var w=CryptoJS.enc.Hex.parse(u);var p=CryptoJS.enc.Hex.parse(q);var t={};t.key=w;t.iv=p;t.ciphertext=r;var v=s.decrypt(t,w,{iv:p});return CryptoJS.enc.Hex.stringify(v)};var l=function(p,r,q){return g(CryptoJS.AES,p,r,q)};var o=function(p,r,q){return g(CryptoJS.TripleDES,p,r,q)};var f=function(p,r,q){return g(CryptoJS.DES,p,r,q)};var g=function(t,y,v,q){var s=CryptoJS.enc.Hex.parse(y);var x=CryptoJS.enc.Hex.parse(v);var p=CryptoJS.enc.Hex.parse(q);var w=t.encrypt(s,x,{iv:p});var r=CryptoJS.enc.Hex.parse(w.toString());var u=CryptoJS.enc.Base64.stringify(r);return u};var i={"AES-256-CBC":{proc:d,eproc:l,keylen:32,ivlen:16},"AES-192-CBC":{proc:d,eproc:l,keylen:24,ivlen:16},"AES-128-CBC":{proc:d,eproc:l,keylen:16,ivlen:16},"DES-EDE3-CBC":{proc:e,eproc:o,keylen:24,ivlen:8},"DES-CBC":{proc:a,eproc:f,keylen:8,ivlen:8}};var m=function(p){var r=CryptoJS.lib.WordArray.random(p);var q=CryptoJS.enc.Hex.stringify(r);return q};var n=function(v){var w={};var q=v.match(new RegExp("DEK-Info: ([^,]+),([0-9A-Fa-f]+)","m"));if(q){w.cipher=q[1];w.ivsalt=q[2];}var p=v.match(new RegExp("-----BEGIN ([A-Z]+) PRIVATE KEY-----"));if(p){w.type=p[1];}var u=-1;var x=0;if(v.indexOf("\r\n\r\n")!=-1){u=v.indexOf("\r\n\r\n");x=2;}if(v.indexOf("\n\n")!=-1){u=v.indexOf("\n\n");x=1;}var t=v.indexOf("-----END");if(u!=-1&&t!=-1){var r=v.substring(u+x*2,t-x);r=r.replace(/\s+/g,"");w.data=r;}return w};var j=function(q,y,p){var v=p.substring(0,16);var t=CryptoJS.enc.Hex.parse(v);var r=CryptoJS.enc.Utf8.parse(y);var u=i[q]["keylen"]+i[q]["ivlen"];var x="";var w=null;for(;;){var s=CryptoJS.algo.MD5.create();if(w!=null){s.update(w);}s.update(r);s.update(t);w=s.finalize();x=x+CryptoJS.enc.Hex.stringify(w);if(x.length>=u*2){break}}var z={};z.keyhex=x.substr(0,i[q]["keylen"]*2);z.ivhex=x.substr(i[q]["keylen"]*2,i[q]["ivlen"]*2);return z};var b=function(p,v,r,w){var s=CryptoJS.enc.Base64.parse(p);var q=CryptoJS.enc.Hex.stringify(s);var u=i[v]["proc"];var t=u(q,r,w);return t};var h=function(p,s,q,u){var r=i[s]["eproc"];var t=r(p,q,u);return t};return {version:"1.0.0",parsePKCS5PEM:function(p){return n(p)},getKeyAndUnusedIvByPasscodeAndIvsalt:function(q,p,r){return j(q,p,r)},decryptKeyB64:function(p,r,q,s){return b(p,r,q,s)},getDecryptedKeyHex:function(y,x){var q=n(y);var r=q.cipher;var p=q.ivsalt;var s=q.data;var w=j(r,x,p);var v=w.keyhex;var u=b(s,r,v,p);return u},getEncryptedPKCS5PEMFromPrvKeyHex:function(x,s,A,t,r){var p="";if(typeof t=="undefined"||t==null){t="AES-256-CBC";}if(typeof i[t]=="undefined"){throw "KEYUTIL unsupported algorithm: "+t}if(typeof r=="undefined"||r==null){var v=i[t]["ivlen"];var u=m(v);r=u.toUpperCase();}var z=j(t,A,r);var y=z.keyhex;var w=h(s,t,y,r);var q=w.replace(/(.{64})/g,"$1\r\n");var p="-----BEGIN "+x+" PRIVATE KEY-----\r\n";p+="Proc-Type: 4,ENCRYPTED\r\n";p+="DEK-Info: "+t+","+r+"\r\n";p+="\r\n";p+=q;p+="\r\n-----END "+x+" PRIVATE KEY-----\r\n";return p},parseHexOfEncryptedPKCS8:function(y){var B=ASN1HEX;var z=B.getChildIdx;var w=B.getV;var t={};var r=z(y,0);if(r.length!=2){throw "malformed format: SEQUENCE(0).items != 2: "+r.length}t.ciphertext=w(y,r[1]);var A=z(y,r[0]);if(A.length!=2){throw "malformed format: SEQUENCE(0.0).items != 2: "+A.length}if(w(y,A[0])!="2a864886f70d01050d"){throw "this only supports pkcs5PBES2"}var p=z(y,A[1]);if(A.length!=2){throw "malformed format: SEQUENCE(0.0.1).items != 2: "+p.length}var q=z(y,p[1]);if(q.length!=2){throw "malformed format: SEQUENCE(0.0.1.1).items != 2: "+q.length}if(w(y,q[0])!="2a864886f70d0307"){throw "this only supports TripleDES"}t.encryptionSchemeAlg="TripleDES";t.encryptionSchemeIV=w(y,q[1]);var s=z(y,p[0]);if(s.length!=2){throw "malformed format: SEQUENCE(0.0.1.0).items != 2: "+s.length}if(w(y,s[0])!="2a864886f70d01050c"){throw "this only supports pkcs5PBKDF2"}var x=z(y,s[1]);if(x.length<2){throw "malformed format: SEQUENCE(0.0.1.0.1).items < 2: "+x.length}t.pbkdf2Salt=w(y,x[0]);var u=w(y,x[1]);try{t.pbkdf2Iter=parseInt(u,16);}catch(v){throw "malformed format pbkdf2Iter: "+u}return t},getPBKDF2KeyHexFromParam:function(u,p){var t=CryptoJS.enc.Hex.parse(u.pbkdf2Salt);var q=u.pbkdf2Iter;var s=CryptoJS.PBKDF2(p,t,{keySize:192/32,iterations:q});var r=CryptoJS.enc.Hex.stringify(s);return r},_getPlainPKCS8HexFromEncryptedPKCS8PEM:function(x,y){var r=pemtohex(x,"ENCRYPTED PRIVATE KEY");var p=this.parseHexOfEncryptedPKCS8(r);var u=KEYUTIL.getPBKDF2KeyHexFromParam(p,y);var v={};v.ciphertext=CryptoJS.enc.Hex.parse(p.ciphertext);var t=CryptoJS.enc.Hex.parse(u);var s=CryptoJS.enc.Hex.parse(p.encryptionSchemeIV);var w=CryptoJS.TripleDES.decrypt(v,t,{iv:s});var q=CryptoJS.enc.Hex.stringify(w);return q},getKeyFromEncryptedPKCS8PEM:function(s,q){var p=this._getPlainPKCS8HexFromEncryptedPKCS8PEM(s,q);var r=this.getKeyFromPlainPrivatePKCS8Hex(p);return r},parsePlainPrivatePKCS8Hex:function(s){var v=ASN1HEX;var u=v.getChildIdx;var t=v.getV;var q={};q.algparam=null;if(s.substr(0,2)!="30"){throw "malformed plain PKCS8 private key(code:001)"}var r=u(s,0);if(r.length!=3){throw "malformed plain PKCS8 private key(code:002)"}if(s.substr(r[1],2)!="30"){throw "malformed PKCS8 private key(code:003)"}var p=u(s,r[1]);if(p.length!=2){throw "malformed PKCS8 private key(code:004)"}if(s.substr(p[0],2)!="06"){throw "malformed PKCS8 private key(code:005)"}q.algoid=t(s,p[0]);if(s.substr(p[1],2)=="06"){q.algparam=t(s,p[1]);}if(s.substr(r[2],2)!="04"){throw "malformed PKCS8 private key(code:006)"}q.keyidx=v.getVidx(s,r[2]);return q},getKeyFromPlainPrivatePKCS8PEM:function(q){var p=pemtohex(q,"PRIVATE KEY");var r=this.getKeyFromPlainPrivatePKCS8Hex(p);return r},getKeyFromPlainPrivatePKCS8Hex:function(p){var q=this.parsePlainPrivatePKCS8Hex(p);var r;if(q.algoid=="2a864886f70d010101"){r=new RSAKey();}else{if(q.algoid=="2a8648ce380401"){r=new KJUR.crypto.DSA();}else{if(q.algoid=="2a8648ce3d0201"){r=new KJUR.crypto.ECDSA();}else{throw "unsupported private key algorithm"}}}r.readPKCS8PrvKeyHex(p);return r},_getKeyFromPublicPKCS8Hex:function(q){var p;var r=ASN1HEX.getVbyList(q,0,[0,0],"06");if(r==="2a864886f70d010101"){p=new RSAKey();}else{if(r==="2a8648ce380401"){p=new KJUR.crypto.DSA();}else{if(r==="2a8648ce3d0201"){p=new KJUR.crypto.ECDSA();}else{throw "unsupported PKCS#8 public key hex"}}}p.readPKCS8PubKeyHex(q);return p},parsePublicRawRSAKeyHex:function(r){var u=ASN1HEX;var t=u.getChildIdx;var s=u.getV;var p={};if(r.substr(0,2)!="30"){throw "malformed RSA key(code:001)"}var q=t(r,0);if(q.length!=2){throw "malformed RSA key(code:002)"}if(r.substr(q[0],2)!="02"){throw "malformed RSA key(code:003)"}p.n=s(r,q[0]);if(r.substr(q[1],2)!="02"){throw "malformed RSA key(code:004)"}p.e=s(r,q[1]);return p},parsePublicPKCS8Hex:function(t){var v=ASN1HEX;var u=v.getChildIdx;var s=v.getV;var q={};q.algparam=null;var r=u(t,0);if(r.length!=2){throw "outer DERSequence shall have 2 elements: "+r.length}var w=r[0];if(t.substr(w,2)!="30"){throw "malformed PKCS8 public key(code:001)"}var p=u(t,w);if(p.length!=2){throw "malformed PKCS8 public key(code:002)"}if(t.substr(p[0],2)!="06"){throw "malformed PKCS8 public key(code:003)"}q.algoid=s(t,p[0]);if(t.substr(p[1],2)=="06"){q.algparam=s(t,p[1]);}else{if(t.substr(p[1],2)=="30"){q.algparam={};q.algparam.p=v.getVbyList(t,p[1],[0],"02");q.algparam.q=v.getVbyList(t,p[1],[1],"02");q.algparam.g=v.getVbyList(t,p[1],[2],"02");}}if(t.substr(r[1],2)!="03"){throw "malformed PKCS8 public key(code:004)"}q.key=s(t,r[1]).substr(2);return q},}}();KEYUTIL.getKey=function(l,k,n){var G=ASN1HEX,L=G.getChildIdx,v=G.getV,d=G.getVbyList,c=KJUR.crypto,i=c.ECDSA,C=c.DSA,w=RSAKey,M=pemtohex,F=KEYUTIL;if(typeof w!="undefined"&&l instanceof w){return l}if(typeof i!="undefined"&&l instanceof i){return l}if(typeof C!="undefined"&&l instanceof C){return l}if(l.curve!==undefined&&l.xy!==undefined&&l.d===undefined){return new i({pub:l.xy,curve:l.curve})}if(l.curve!==undefined&&l.d!==undefined){return new i({prv:l.d,curve:l.curve})}if(l.kty===undefined&&l.n!==undefined&&l.e!==undefined&&l.d===undefined){var P=new w();P.setPublic(l.n,l.e);return P}if(l.kty===undefined&&l.n!==undefined&&l.e!==undefined&&l.d!==undefined&&l.p!==undefined&&l.q!==undefined&&l.dp!==undefined&&l.dq!==undefined&&l.co!==undefined&&l.qi===undefined){var P=new w();P.setPrivateEx(l.n,l.e,l.d,l.p,l.q,l.dp,l.dq,l.co);return P}if(l.kty===undefined&&l.n!==undefined&&l.e!==undefined&&l.d!==undefined&&l.p===undefined){var P=new w();P.setPrivate(l.n,l.e,l.d);return P}if(l.p!==undefined&&l.q!==undefined&&l.g!==undefined&&l.y!==undefined&&l.x===undefined){var P=new C();P.setPublic(l.p,l.q,l.g,l.y);return P}if(l.p!==undefined&&l.q!==undefined&&l.g!==undefined&&l.y!==undefined&&l.x!==undefined){var P=new C();P.setPrivate(l.p,l.q,l.g,l.y,l.x);return P}if(l.kty==="RSA"&&l.n!==undefined&&l.e!==undefined&&l.d===undefined){var P=new w();P.setPublic(b64utohex(l.n),b64utohex(l.e));return P}if(l.kty==="RSA"&&l.n!==undefined&&l.e!==undefined&&l.d!==undefined&&l.p!==undefined&&l.q!==undefined&&l.dp!==undefined&&l.dq!==undefined&&l.qi!==undefined){var P=new w();P.setPrivateEx(b64utohex(l.n),b64utohex(l.e),b64utohex(l.d),b64utohex(l.p),b64utohex(l.q),b64utohex(l.dp),b64utohex(l.dq),b64utohex(l.qi));return P}if(l.kty==="RSA"&&l.n!==undefined&&l.e!==undefined&&l.d!==undefined){var P=new w();P.setPrivate(b64utohex(l.n),b64utohex(l.e),b64utohex(l.d));return P}if(l.kty==="EC"&&l.crv!==undefined&&l.x!==undefined&&l.y!==undefined&&l.d===undefined){var j=new i({curve:l.crv});var t=j.ecparams.keylen/4;var B=("0000000000"+b64utohex(l.x)).slice(-t);var z=("0000000000"+b64utohex(l.y)).slice(-t);var u="04"+B+z;j.setPublicKeyHex(u);return j}if(l.kty==="EC"&&l.crv!==undefined&&l.x!==undefined&&l.y!==undefined&&l.d!==undefined){var j=new i({curve:l.crv});var t=j.ecparams.keylen/4;var B=("0000000000"+b64utohex(l.x)).slice(-t);var z=("0000000000"+b64utohex(l.y)).slice(-t);var u="04"+B+z;var b=("0000000000"+b64utohex(l.d)).slice(-t);j.setPublicKeyHex(u);j.setPrivateKeyHex(b);return j}if(n==="pkcs5prv"){var J=l,G=ASN1HEX,N,P;N=L(J,0);if(N.length===9){P=new w();P.readPKCS5PrvKeyHex(J);}else{if(N.length===6){P=new C();P.readPKCS5PrvKeyHex(J);}else{if(N.length>2&&J.substr(N[1],2)==="04"){P=new i();P.readPKCS5PrvKeyHex(J);}else{throw "unsupported PKCS#1/5 hexadecimal key"}}}return P}if(n==="pkcs8prv"){var P=F.getKeyFromPlainPrivatePKCS8Hex(l);return P}if(n==="pkcs8pub"){return F._getKeyFromPublicPKCS8Hex(l)}if(n==="x509pub"){return X509.getPublicKeyFromCertHex(l)}if(l.indexOf("-END CERTIFICATE-",0)!=-1||l.indexOf("-END X509 CERTIFICATE-",0)!=-1||l.indexOf("-END TRUSTED CERTIFICATE-",0)!=-1){return X509.getPublicKeyFromCertPEM(l)}if(l.indexOf("-END PUBLIC KEY-")!=-1){var O=pemtohex(l,"PUBLIC KEY");return F._getKeyFromPublicPKCS8Hex(O)}if(l.indexOf("-END RSA PRIVATE KEY-")!=-1&&l.indexOf("4,ENCRYPTED")==-1){var m=M(l,"RSA PRIVATE KEY");return F.getKey(m,null,"pkcs5prv")}if(l.indexOf("-END DSA PRIVATE KEY-")!=-1&&l.indexOf("4,ENCRYPTED")==-1){var I=M(l,"DSA PRIVATE KEY");var E=d(I,0,[1],"02");var D=d(I,0,[2],"02");var K=d(I,0,[3],"02");var r=d(I,0,[4],"02");var s=d(I,0,[5],"02");var P=new C();P.setPrivate(new BigInteger(E,16),new BigInteger(D,16),new BigInteger(K,16),new BigInteger(r,16),new BigInteger(s,16));return P}if(l.indexOf("-END PRIVATE KEY-")!=-1){return F.getKeyFromPlainPrivatePKCS8PEM(l)}if(l.indexOf("-END RSA PRIVATE KEY-")!=-1&&l.indexOf("4,ENCRYPTED")!=-1){var o=F.getDecryptedKeyHex(l,k);var H=new RSAKey();H.readPKCS5PrvKeyHex(o);return H}if(l.indexOf("-END EC PRIVATE KEY-")!=-1&&l.indexOf("4,ENCRYPTED")!=-1){var I=F.getDecryptedKeyHex(l,k);var P=d(I,0,[1],"04");var f=d(I,0,[2,0],"06");var A=d(I,0,[3,0],"03").substr(2);var e="";if(KJUR.crypto.OID.oidhex2name[f]!==undefined){e=KJUR.crypto.OID.oidhex2name[f];}else{throw "undefined OID(hex) in KJUR.crypto.OID: "+f}var j=new i({curve:e});j.setPublicKeyHex(A);j.setPrivateKeyHex(P);j.isPublic=false;return j}if(l.indexOf("-END DSA PRIVATE KEY-")!=-1&&l.indexOf("4,ENCRYPTED")!=-1){var I=F.getDecryptedKeyHex(l,k);var E=d(I,0,[1],"02");var D=d(I,0,[2],"02");var K=d(I,0,[3],"02");var r=d(I,0,[4],"02");var s=d(I,0,[5],"02");var P=new C();P.setPrivate(new BigInteger(E,16),new BigInteger(D,16),new BigInteger(K,16),new BigInteger(r,16),new BigInteger(s,16));return P}if(l.indexOf("-END ENCRYPTED PRIVATE KEY-")!=-1){return F.getKeyFromEncryptedPKCS8PEM(l,k)}throw "not supported argument"};KEYUTIL.generateKeypair=function(a,c){if(a=="RSA"){var b=c;var h=new RSAKey();h.generate(b,"10001");h.isPrivate=true;h.isPublic=true;var f=new RSAKey();var e=h.n.toString(16);var i=h.e.toString(16);f.setPublic(e,i);f.isPrivate=false;f.isPublic=true;var k={};k.prvKeyObj=h;k.pubKeyObj=f;return k}else{if(a=="EC"){var d=c;var g=new KJUR.crypto.ECDSA({curve:d});var j=g.generateKeyPairHex();var h=new KJUR.crypto.ECDSA({curve:d});h.setPublicKeyHex(j.ecpubhex);h.setPrivateKeyHex(j.ecprvhex);h.isPrivate=true;h.isPublic=false;var f=new KJUR.crypto.ECDSA({curve:d});f.setPublicKeyHex(j.ecpubhex);f.isPrivate=false;f.isPublic=true;var k={};k.prvKeyObj=h;k.pubKeyObj=f;return k}else{throw "unknown algorithm: "+a}}};KEYUTIL.getPEM=function(b,D,y,m,q,j){var F=KJUR,k=F.asn1,z=k.DERObjectIdentifier,f=k.DERInteger,l=k.ASN1Util.newObject,a=k.x509,C=a.SubjectPublicKeyInfo,e=F.crypto,u=e.DSA,r=e.ECDSA,n=RSAKey;function A(s){var G=l({seq:[{"int":0},{"int":{bigint:s.n}},{"int":s.e},{"int":{bigint:s.d}},{"int":{bigint:s.p}},{"int":{bigint:s.q}},{"int":{bigint:s.dmp1}},{"int":{bigint:s.dmq1}},{"int":{bigint:s.coeff}}]});return G}function B(G){var s=l({seq:[{"int":1},{octstr:{hex:G.prvKeyHex}},{tag:["a0",true,{oid:{name:G.curveName}}]},{tag:["a1",true,{bitstr:{hex:"00"+G.pubKeyHex}}]}]});return s}function x(s){var G=l({seq:[{"int":0},{"int":{bigint:s.p}},{"int":{bigint:s.q}},{"int":{bigint:s.g}},{"int":{bigint:s.y}},{"int":{bigint:s.x}}]});return G}if(((n!==undefined&&b instanceof n)||(u!==undefined&&b instanceof u)||(r!==undefined&&b instanceof r))&&b.isPublic==true&&(D===undefined||D=="PKCS8PUB")){var E=new C(b);var w=E.getEncodedHex();return hextopem(w,"PUBLIC KEY")}if(D=="PKCS1PRV"&&n!==undefined&&b instanceof n&&(y===undefined||y==null)&&b.isPrivate==true){var E=A(b);var w=E.getEncodedHex();return hextopem(w,"RSA PRIVATE KEY")}if(D=="PKCS1PRV"&&r!==undefined&&b instanceof r&&(y===undefined||y==null)&&b.isPrivate==true){var i=new z({name:b.curveName});var v=i.getEncodedHex();var h=B(b);var t=h.getEncodedHex();var p="";p+=hextopem(v,"EC PARAMETERS");p+=hextopem(t,"EC PRIVATE KEY");return p}if(D=="PKCS1PRV"&&u!==undefined&&b instanceof u&&(y===undefined||y==null)&&b.isPrivate==true){var E=x(b);var w=E.getEncodedHex();return hextopem(w,"DSA PRIVATE KEY")}if(D=="PKCS5PRV"&&n!==undefined&&b instanceof n&&(y!==undefined&&y!=null)&&b.isPrivate==true){var E=A(b);var w=E.getEncodedHex();if(m===undefined){m="DES-EDE3-CBC";}return this.getEncryptedPKCS5PEMFromPrvKeyHex("RSA",w,y,m,j)}if(D=="PKCS5PRV"&&r!==undefined&&b instanceof r&&(y!==undefined&&y!=null)&&b.isPrivate==true){var E=B(b);var w=E.getEncodedHex();if(m===undefined){m="DES-EDE3-CBC";}return this.getEncryptedPKCS5PEMFromPrvKeyHex("EC",w,y,m,j)}if(D=="PKCS5PRV"&&u!==undefined&&b instanceof u&&(y!==undefined&&y!=null)&&b.isPrivate==true){var E=x(b);var w=E.getEncodedHex();if(m===undefined){m="DES-EDE3-CBC";}return this.getEncryptedPKCS5PEMFromPrvKeyHex("DSA",w,y,m,j)}var o=function(G,s){var I=c(G,s);var H=new l({seq:[{seq:[{oid:{name:"pkcs5PBES2"}},{seq:[{seq:[{oid:{name:"pkcs5PBKDF2"}},{seq:[{octstr:{hex:I.pbkdf2Salt}},{"int":I.pbkdf2Iter}]}]},{seq:[{oid:{name:"des-EDE3-CBC"}},{octstr:{hex:I.encryptionSchemeIV}}]}]}]},{octstr:{hex:I.ciphertext}}]});return H.getEncodedHex()};var c=function(N,O){var H=100;var M=CryptoJS.lib.WordArray.random(8);var L="DES-EDE3-CBC";var s=CryptoJS.lib.WordArray.random(8);var I=CryptoJS.PBKDF2(O,M,{keySize:192/32,iterations:H});var J=CryptoJS.enc.Hex.parse(N);var K=CryptoJS.TripleDES.encrypt(J,I,{iv:s})+"";var G={};G.ciphertext=K;G.pbkdf2Salt=CryptoJS.enc.Hex.stringify(M);G.pbkdf2Iter=H;G.encryptionSchemeAlg=L;G.encryptionSchemeIV=CryptoJS.enc.Hex.stringify(s);return G};if(D=="PKCS8PRV"&&n!=undefined&&b instanceof n&&b.isPrivate==true){var g=A(b);var d=g.getEncodedHex();var E=l({seq:[{"int":0},{seq:[{oid:{name:"rsaEncryption"}},{"null":true}]},{octstr:{hex:d}}]});var w=E.getEncodedHex();if(y===undefined||y==null){return hextopem(w,"PRIVATE KEY")}else{var t=o(w,y);return hextopem(t,"ENCRYPTED PRIVATE KEY")}}if(D=="PKCS8PRV"&&r!==undefined&&b instanceof r&&b.isPrivate==true){var g=new l({seq:[{"int":1},{octstr:{hex:b.prvKeyHex}},{tag:["a1",true,{bitstr:{hex:"00"+b.pubKeyHex}}]}]});var d=g.getEncodedHex();var E=l({seq:[{"int":0},{seq:[{oid:{name:"ecPublicKey"}},{oid:{name:b.curveName}}]},{octstr:{hex:d}}]});var w=E.getEncodedHex();if(y===undefined||y==null){return hextopem(w,"PRIVATE KEY")}else{var t=o(w,y);return hextopem(t,"ENCRYPTED PRIVATE KEY")}}if(D=="PKCS8PRV"&&u!==undefined&&b instanceof u&&b.isPrivate==true){var g=new f({bigint:b.x});var d=g.getEncodedHex();var E=l({seq:[{"int":0},{seq:[{oid:{name:"dsa"}},{seq:[{"int":{bigint:b.p}},{"int":{bigint:b.q}},{"int":{bigint:b.g}}]}]},{octstr:{hex:d}}]});var w=E.getEncodedHex();if(y===undefined||y==null){return hextopem(w,"PRIVATE KEY")}else{var t=o(w,y);return hextopem(t,"ENCRYPTED PRIVATE KEY")}}throw "unsupported object nor format"};KEYUTIL.getKeyFromCSRPEM=function(b){var a=pemtohex(b,"CERTIFICATE REQUEST");var c=KEYUTIL.getKeyFromCSRHex(a);return c};KEYUTIL.getKeyFromCSRHex=function(a){var c=KEYUTIL.parseCSRHex(a);var b=KEYUTIL.getKey(c.p8pubkeyhex,null,"pkcs8pub");return b};KEYUTIL.parseCSRHex=function(d){var i=ASN1HEX;var f=i.getChildIdx;var c=i.getTLV;var b={};var g=d;if(g.substr(0,2)!="30"){throw "malformed CSR(code:001)"}var e=f(g,0);if(e.length<1){throw "malformed CSR(code:002)"}if(g.substr(e[0],2)!="30"){throw "malformed CSR(code:003)"}var a=f(g,e[0]);if(a.length<3){throw "malformed CSR(code:004)"}b.p8pubkeyhex=c(g,a[2]);return b};KEYUTIL.getJWKFromKey=function(d){var b={};if(d instanceof RSAKey&&d.isPrivate){b.kty="RSA";b.n=hextob64u(d.n.toString(16));b.e=hextob64u(d.e.toString(16));b.d=hextob64u(d.d.toString(16));b.p=hextob64u(d.p.toString(16));b.q=hextob64u(d.q.toString(16));b.dp=hextob64u(d.dmp1.toString(16));b.dq=hextob64u(d.dmq1.toString(16));b.qi=hextob64u(d.coeff.toString(16));return b}else{if(d instanceof RSAKey&&d.isPublic){b.kty="RSA";b.n=hextob64u(d.n.toString(16));b.e=hextob64u(d.e.toString(16));return b}else{if(d instanceof KJUR.crypto.ECDSA&&d.isPrivate){var a=d.getShortNISTPCurveName();if(a!=="P-256"&&a!=="P-384"){throw "unsupported curve name for JWT: "+a}var c=d.getPublicKeyXYHex();b.kty="EC";b.crv=a;b.x=hextob64u(c.x);b.y=hextob64u(c.y);b.d=hextob64u(d.prvKeyHex);return b}else{if(d instanceof KJUR.crypto.ECDSA&&d.isPublic){var a=d.getShortNISTPCurveName();if(a!=="P-256"&&a!=="P-384"){throw "unsupported curve name for JWT: "+a}var c=d.getPublicKeyXYHex();b.kty="EC";b.crv=a;b.x=hextob64u(c.x);b.y=hextob64u(c.y);return b}}}}throw "not supported key object"};
    RSAKey.getPosArrayOfChildrenFromHex=function(a){return ASN1HEX.getChildIdx(a,0)};RSAKey.getHexValueArrayOfChildrenFromHex=function(f){var n=ASN1HEX;var i=n.getV;var k=RSAKey.getPosArrayOfChildrenFromHex(f);var e=i(f,k[0]);var j=i(f,k[1]);var b=i(f,k[2]);var c=i(f,k[3]);var h=i(f,k[4]);var g=i(f,k[5]);var m=i(f,k[6]);var l=i(f,k[7]);var d=i(f,k[8]);var k=new Array();k.push(e,j,b,c,h,g,m,l,d);return k};RSAKey.prototype.readPrivateKeyFromPEMString=function(d){var c=pemtohex(d);var b=RSAKey.getHexValueArrayOfChildrenFromHex(c);this.setPrivateEx(b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8]);};RSAKey.prototype.readPKCS5PrvKeyHex=function(c){var b=RSAKey.getHexValueArrayOfChildrenFromHex(c);this.setPrivateEx(b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8]);};RSAKey.prototype.readPKCS8PrvKeyHex=function(e){var c,j,l,b,a,f,d,k;var m=ASN1HEX;var g=m.getVbyList;if(m.isASN1HEX(e)===false){throw "not ASN.1 hex string"}try{c=g(e,0,[2,0,1],"02");j=g(e,0,[2,0,2],"02");l=g(e,0,[2,0,3],"02");b=g(e,0,[2,0,4],"02");a=g(e,0,[2,0,5],"02");f=g(e,0,[2,0,6],"02");d=g(e,0,[2,0,7],"02");k=g(e,0,[2,0,8],"02");}catch(i){throw "malformed PKCS#8 plain RSA private key"}this.setPrivateEx(c,j,l,b,a,f,d,k);};RSAKey.prototype.readPKCS5PubKeyHex=function(c){var e=ASN1HEX;var b=e.getV;if(e.isASN1HEX(c)===false){throw "keyHex is not ASN.1 hex string"}var a=e.getChildIdx(c,0);if(a.length!==2||c.substr(a[0],2)!=="02"||c.substr(a[1],2)!=="02"){throw "wrong hex for PKCS#5 public key"}var f=b(c,a[0]);var d=b(c,a[1]);this.setPublic(f,d);};RSAKey.prototype.readPKCS8PubKeyHex=function(b){var c=ASN1HEX;if(c.isASN1HEX(b)===false){throw "not ASN.1 hex string"}if(c.getTLVbyList(b,0,[0,0])!=="06092a864886f70d010101"){throw "not PKCS8 RSA public key"}var a=c.getTLVbyList(b,0,[1,0]);this.readPKCS5PubKeyHex(a);};RSAKey.prototype.readCertPubKeyHex=function(b,d){var a,c;a=new X509();a.readCertHex(b);c=a.getPublicKeyHex();this.readPKCS8PubKeyHex(c);};
    var _RE_HEXDECONLY=new RegExp("");_RE_HEXDECONLY.compile("[^0-9a-f]","gi");function _zeroPaddingOfSignature(e,d){var c="";var a=d/4-e.length;for(var b=0;b<a;b++){c=c+"0";}return c+e}RSAKey.prototype.sign=function(d,a){var b=function(e){return KJUR.crypto.Util.hashString(e,a)};var c=b(d);return this.signWithMessageHash(c,a)};RSAKey.prototype.signWithMessageHash=function(e,c){var f=KJUR.crypto.Util.getPaddedDigestInfoHex(e,c,this.n.bitLength());var b=parseBigInt(f,16);var d=this.doPrivate(b);var a=d.toString(16);return _zeroPaddingOfSignature(a,this.n.bitLength())};function pss_mgf1_str(c,a,e){var b="",d=0;while(b.length<a){b+=hextorstr(e(rstrtohex(c+String.fromCharCode.apply(String,[(d&4278190080)>>24,(d&16711680)>>16,(d&65280)>>8,d&255]))));d+=1;}return b}RSAKey.prototype.signPSS=function(e,a,d){var c=function(f){return KJUR.crypto.Util.hashHex(f,a)};var b=c(rstrtohex(e));if(d===undefined){d=-1;}return this.signWithMessageHashPSS(b,a,d)};RSAKey.prototype.signWithMessageHashPSS=function(l,a,k){var b=hextorstr(l);var g=b.length;var m=this.n.bitLength()-1;var c=Math.ceil(m/8);var d;var o=function(i){return KJUR.crypto.Util.hashHex(i,a)};if(k===-1||k===undefined){k=g;}else{if(k===-2){k=c-g-2;}else{if(k<-2){throw "invalid salt length"}}}if(c<(g+k+2)){throw "data too long"}var f="";if(k>0){f=new Array(k);new SecureRandom().nextBytes(f);f=String.fromCharCode.apply(String,f);}var n=hextorstr(o(rstrtohex("\x00\x00\x00\x00\x00\x00\x00\x00"+b+f)));var j=[];for(d=0;d<c-k-g-2;d+=1){j[d]=0;}var e=String.fromCharCode.apply(String,j)+"\x01"+f;var h=pss_mgf1_str(n,e.length,o);var q=[];for(d=0;d<e.length;d+=1){q[d]=e.charCodeAt(d)^h.charCodeAt(d);}var p=(65280>>(8*c-m))&255;q[0]&=~p;for(d=0;d<g;d++){q.push(n.charCodeAt(d));}q.push(188);return _zeroPaddingOfSignature(this.doPrivate(new BigInteger(q)).toString(16),this.n.bitLength())};function _rsasign_getAlgNameAndHashFromHexDisgestInfo(f){for(var e in KJUR.crypto.Util.DIGESTINFOHEAD){var d=KJUR.crypto.Util.DIGESTINFOHEAD[e];var b=d.length;if(f.substring(0,b)==d){var c=[e,f.substring(b)];return c}}return []}RSAKey.prototype.verify=function(f,j){j=j.replace(_RE_HEXDECONLY,"");j=j.replace(/[ \n]+/g,"");var b=parseBigInt(j,16);if(b.bitLength()>this.n.bitLength()){return 0}var i=this.doPublic(b);var e=i.toString(16).replace(/^1f+00/,"");var g=_rsasign_getAlgNameAndHashFromHexDisgestInfo(e);if(g.length==0){return false}var d=g[0];var h=g[1];var a=function(k){return KJUR.crypto.Util.hashString(k,d)};var c=a(f);return(h==c)};RSAKey.prototype.verifyWithMessageHash=function(e,a){a=a.replace(_RE_HEXDECONLY,"");a=a.replace(/[ \n]+/g,"");var b=parseBigInt(a,16);if(b.bitLength()>this.n.bitLength()){return 0}var h=this.doPublic(b);var g=h.toString(16).replace(/^1f+00/,"");var c=_rsasign_getAlgNameAndHashFromHexDisgestInfo(g);if(c.length==0){return false}var d=c[0];var f=c[1];return(f==e)};RSAKey.prototype.verifyPSS=function(c,b,a,f){var e=function(g){return KJUR.crypto.Util.hashHex(g,a)};var d=e(rstrtohex(c));if(f===undefined){f=-1;}return this.verifyWithMessageHashPSS(d,b,a,f)};RSAKey.prototype.verifyWithMessageHashPSS=function(f,s,l,c){var k=new BigInteger(s,16);if(k.bitLength()>this.n.bitLength()){return false}var r=function(i){return KJUR.crypto.Util.hashHex(i,l)};var j=hextorstr(f);var h=j.length;var g=this.n.bitLength()-1;var m=Math.ceil(g/8);var q;if(c===-1||c===undefined){c=h;}else{if(c===-2){c=m-h-2;}else{if(c<-2){throw "invalid salt length"}}}if(m<(h+c+2)){throw "data too long"}var a=this.doPublic(k).toByteArray();for(q=0;q<a.length;q+=1){a[q]&=255;}while(a.length<m){a.unshift(0);}if(a[m-1]!==188){throw "encoded message does not end in 0xbc"}a=String.fromCharCode.apply(String,a);var d=a.substr(0,m-h-1);var e=a.substr(d.length,h);var p=(65280>>(8*m-g))&255;if((d.charCodeAt(0)&p)!==0){throw "bits beyond keysize not zero"}var n=pss_mgf1_str(e,d.length,r);var o=[];for(q=0;q<d.length;q+=1){o[q]=d.charCodeAt(q)^n.charCodeAt(q);}o[0]&=~p;var b=m-h-c-2;for(q=0;q<b;q+=1){if(o[q]!==0){throw "leftmost octets not zero"}}if(o[b]!==1){throw "0x01 marker not found"}return e===hextorstr(r(rstrtohex("\x00\x00\x00\x00\x00\x00\x00\x00"+j+String.fromCharCode.apply(String,o.slice(-c)))))};RSAKey.SALT_LEN_HLEN=-1;RSAKey.SALT_LEN_MAX=-2;RSAKey.SALT_LEN_RECOVER=-2;
    function X509(){var k=ASN1HEX,j=k.getChildIdx,h=k.getV,b=k.getTLV,f=k.getVbyList,c=k.getTLVbyList,g=k.getIdxbyList,d=k.getVidx,i=k.oidname,a=X509,e=pemtohex;this.hex=null;this.version=0;this.foffset=0;this.aExtInfo=null;this.getVersion=function(){if(this.hex===null||this.version!==0){return this.version}if(c(this.hex,0,[0,0])!=="a003020102"){this.version=1;this.foffset=-1;return 1}this.version=3;return 3};this.getSerialNumberHex=function(){return f(this.hex,0,[0,1+this.foffset],"02")};this.getSignatureAlgorithmField=function(){return i(f(this.hex,0,[0,2+this.foffset,0],"06"))};this.getIssuerHex=function(){return c(this.hex,0,[0,3+this.foffset],"30")};this.getIssuerString=function(){return a.hex2dn(this.getIssuerHex())};this.getSubjectHex=function(){return c(this.hex,0,[0,5+this.foffset],"30")};this.getSubjectString=function(){return a.hex2dn(this.getSubjectHex())};this.getNotBefore=function(){var l=f(this.hex,0,[0,4+this.foffset,0]);l=l.replace(/(..)/g,"%$1");l=decodeURIComponent(l);return l};this.getNotAfter=function(){var l=f(this.hex,0,[0,4+this.foffset,1]);l=l.replace(/(..)/g,"%$1");l=decodeURIComponent(l);return l};this.getPublicKeyHex=function(){return k.getTLVbyList(this.hex,0,[0,6+this.foffset],"30")};this.getPublicKeyIdx=function(){return g(this.hex,0,[0,6+this.foffset],"30")};this.getPublicKeyContentIdx=function(){var l=this.getPublicKeyIdx();return g(this.hex,l,[1,0],"30")};this.getPublicKey=function(){return KEYUTIL.getKey(this.getPublicKeyHex(),null,"pkcs8pub")};this.getSignatureAlgorithmName=function(){return i(f(this.hex,0,[1,0],"06"))};this.getSignatureValueHex=function(){return f(this.hex,0,[2],"03",true)};this.verifySignature=function(n){var o=this.getSignatureAlgorithmName();var l=this.getSignatureValueHex();var m=c(this.hex,0,[0],"30");var p=new KJUR.crypto.Signature({alg:o});p.init(n);p.updateHex(m);return p.verify(l)};this.parseExt=function(){if(this.version!==3){return -1}var p=g(this.hex,0,[0,7,0],"30");var m=j(this.hex,p);this.aExtInfo=new Array();for(var n=0;n<m.length;n++){var q={};q.critical=false;var l=j(this.hex,m[n]);var r=0;if(l.length===3){q.critical=true;r=1;}q.oid=k.hextooidstr(f(this.hex,m[n],[0],"06"));var o=g(this.hex,m[n],[1+r]);q.vidx=d(this.hex,o);this.aExtInfo.push(q);}};this.getExtInfo=function(n){var l=this.aExtInfo;var o=n;if(!n.match(/^[0-9.]+$/)){o=KJUR.asn1.x509.OID.name2oid(n);}if(o===""){return undefined}for(var m=0;m<l.length;m++){if(l[m].oid===o){return l[m]}}return undefined};this.getExtBasicConstraints=function(){var n=this.getExtInfo("basicConstraints");if(n===undefined){return n}var l=h(this.hex,n.vidx);if(l===""){return {}}if(l==="0101ff"){return {cA:true}}if(l.substr(0,8)==="0101ff02"){var o=h(l,6);var m=parseInt(o,16);return {cA:true,pathLen:m}}throw "basicConstraints parse error"};this.getExtKeyUsageBin=function(){var o=this.getExtInfo("keyUsage");if(o===undefined){return ""}var m=h(this.hex,o.vidx);if(m.length%2!=0||m.length<=2){throw "malformed key usage value"}var l=parseInt(m.substr(0,2));var n=parseInt(m.substr(2),16).toString(2);return n.substr(0,n.length-l)};this.getExtKeyUsageString=function(){var n=this.getExtKeyUsageBin();var l=new Array();for(var m=0;m<n.length;m++){if(n.substr(m,1)=="1"){l.push(X509.KEYUSAGE_NAME[m]);}}return l.join(",")};this.getExtSubjectKeyIdentifier=function(){var l=this.getExtInfo("subjectKeyIdentifier");if(l===undefined){return l}return h(this.hex,l.vidx)};this.getExtAuthorityKeyIdentifier=function(){var p=this.getExtInfo("authorityKeyIdentifier");if(p===undefined){return p}var l={};var o=b(this.hex,p.vidx);var m=j(o,0);for(var n=0;n<m.length;n++){if(o.substr(m[n],2)==="80"){l.kid=h(o,m[n]);}}return l};this.getExtExtKeyUsageName=function(){var p=this.getExtInfo("extKeyUsage");if(p===undefined){return p}var l=new Array();var o=b(this.hex,p.vidx);if(o===""){return l}var m=j(o,0);for(var n=0;n<m.length;n++){l.push(i(h(o,m[n])));}return l};this.getExtSubjectAltName=function(){var m=this.getExtSubjectAltName2();var l=new Array();for(var n=0;n<m.length;n++){if(m[n][0]==="DNS"){l.push(m[n][1]);}}return l};this.getExtSubjectAltName2=function(){var p,s,r;var q=this.getExtInfo("subjectAltName");if(q===undefined){return q}var l=new Array();var o=b(this.hex,q.vidx);var m=j(o,0);for(var n=0;n<m.length;n++){r=o.substr(m[n],2);p=h(o,m[n]);if(r==="81"){s=hextoutf8(p);l.push(["MAIL",s]);}if(r==="82"){s=hextoutf8(p);l.push(["DNS",s]);}if(r==="84"){s=X509.hex2dn(p,0);l.push(["DN",s]);}if(r==="86"){s=hextoutf8(p);l.push(["URI",s]);}if(r==="87"){s=hextoip(p);l.push(["IP",s]);}}return l};this.getExtCRLDistributionPointsURI=function(){var q=this.getExtInfo("cRLDistributionPoints");if(q===undefined){return q}var l=new Array();var m=j(this.hex,q.vidx);for(var o=0;o<m.length;o++){try{var r=f(this.hex,m[o],[0,0,0],"86");var p=hextoutf8(r);l.push(p);}catch(n){}}return l};this.getExtAIAInfo=function(){var p=this.getExtInfo("authorityInfoAccess");if(p===undefined){return p}var l={ocsp:[],caissuer:[]};var m=j(this.hex,p.vidx);for(var n=0;n<m.length;n++){var q=f(this.hex,m[n],[0],"06");var o=f(this.hex,m[n],[1],"86");if(q==="2b06010505073001"){l.ocsp.push(hextoutf8(o));}if(q==="2b06010505073002"){l.caissuer.push(hextoutf8(o));}}return l};this.getExtCertificatePolicies=function(){var o=this.getExtInfo("certificatePolicies");if(o===undefined){return o}var l=b(this.hex,o.vidx);var u=[];var s=j(l,0);for(var r=0;r<s.length;r++){var t={};var n=j(l,s[r]);t.id=i(h(l,n[0]));if(n.length===2){var m=j(l,n[1]);for(var q=0;q<m.length;q++){var p=f(l,m[q],[0],"06");if(p==="2b06010505070201"){t.cps=hextoutf8(f(l,m[q],[1]));}else{if(p==="2b06010505070202"){t.unotice=hextoutf8(f(l,m[q],[1,0]));}}}}u.push(t);}return u};this.readCertPEM=function(l){this.readCertHex(e(l));};this.readCertHex=function(l){this.hex=l;this.getVersion();try{g(this.hex,0,[0,7],"a3");this.parseExt();}catch(m){}};this.getInfo=function(){var B,u,z;B="Basic Fields\n";B+="  serial number: "+this.getSerialNumberHex()+"\n";B+="  signature algorithm: "+this.getSignatureAlgorithmField()+"\n";B+="  issuer: "+this.getIssuerString()+"\n";B+="  notBefore: "+this.getNotBefore()+"\n";B+="  notAfter: "+this.getNotAfter()+"\n";B+="  subject: "+this.getSubjectString()+"\n";B+="  subject public key info: \n";u=this.getPublicKey();B+="    key algorithm: "+u.type+"\n";if(u.type==="RSA"){B+="    n="+hextoposhex(u.n.toString(16)).substr(0,16)+"...\n";B+="    e="+hextoposhex(u.e.toString(16))+"\n";}z=this.aExtInfo;if(z!==undefined&&z!==null){B+="X509v3 Extensions:\n";for(var r=0;r<z.length;r++){var n=z[r];var A=KJUR.asn1.x509.OID.oid2name(n.oid);if(A===""){A=n.oid;}var x="";if(n.critical===true){x="CRITICAL";}B+="  "+A+" "+x+":\n";if(A==="basicConstraints"){var v=this.getExtBasicConstraints();if(v.cA===undefined){B+="    {}\n";}else{B+="    cA=true";if(v.pathLen!==undefined){B+=", pathLen="+v.pathLen;}B+="\n";}}else{if(A==="keyUsage"){B+="    "+this.getExtKeyUsageString()+"\n";}else{if(A==="subjectKeyIdentifier"){B+="    "+this.getExtSubjectKeyIdentifier()+"\n";}else{if(A==="authorityKeyIdentifier"){var l=this.getExtAuthorityKeyIdentifier();if(l.kid!==undefined){B+="    kid="+l.kid+"\n";}}else{if(A==="extKeyUsage"){var w=this.getExtExtKeyUsageName();B+="    "+w.join(", ")+"\n";}else{if(A==="subjectAltName"){var t=this.getExtSubjectAltName2();B+="    "+t+"\n";}else{if(A==="cRLDistributionPoints"){var y=this.getExtCRLDistributionPointsURI();B+="    "+y+"\n";}else{if(A==="authorityInfoAccess"){var p=this.getExtAIAInfo();if(p.ocsp!==undefined){B+="    ocsp: "+p.ocsp.join(",")+"\n";}if(p.caissuer!==undefined){B+="    caissuer: "+p.caissuer.join(",")+"\n";}}else{if(A==="certificatePolicies"){var o=this.getExtCertificatePolicies();for(var q=0;q<o.length;q++){if(o[q].id!==undefined){B+="    policy oid: "+o[q].id+"\n";}if(o[q].cps!==undefined){B+="    cps: "+o[q].cps+"\n";}}}}}}}}}}}}}B+="signature algorithm: "+this.getSignatureAlgorithmName()+"\n";B+="signature: "+this.getSignatureValueHex().substr(0,16)+"...\n";return B};}X509.hex2dn=function(f,b){if(b===undefined){b=0;}if(f.substr(b,2)!=="30"){throw "malformed DN"}var c=new Array();var d=ASN1HEX.getChildIdx(f,b);for(var e=0;e<d.length;e++){c.push(X509.hex2rdn(f,d[e]));}c=c.map(function(a){return a.replace("/","\\/")});return "/"+c.join("/")};X509.hex2rdn=function(f,b){if(b===undefined){b=0;}if(f.substr(b,2)!=="31"){throw "malformed RDN"}var c=new Array();var d=ASN1HEX.getChildIdx(f,b);for(var e=0;e<d.length;e++){c.push(X509.hex2attrTypeValue(f,d[e]));}c=c.map(function(a){return a.replace("+","\\+")});return c.join("+")};X509.hex2attrTypeValue=function(d,i){var j=ASN1HEX;var h=j.getV;if(i===undefined){i=0;}if(d.substr(i,2)!=="30"){throw "malformed attribute type and value"}var g=j.getChildIdx(d,i);if(g.length!==2||d.substr(g[0],2)!=="06");var b=h(d,g[0]);var f=KJUR.asn1.ASN1Util.oidHexToInt(b);var e=KJUR.asn1.x509.OID.oid2atype(f);var a=h(d,g[1]);var c=hextorstr(a);return e+"="+c};X509.getPublicKeyFromCertHex=function(b){var a=new X509();a.readCertHex(b);return a.getPublicKey()};X509.getPublicKeyFromCertPEM=function(b){var a=new X509();a.readCertPEM(b);return a.getPublicKey()};X509.getPublicKeyInfoPropOfCertPEM=function(c){var e=ASN1HEX;var g=e.getVbyList;var b={};var a,f;b.algparam=null;a=new X509();a.readCertPEM(c);f=a.getPublicKeyHex();b.keyhex=g(f,0,[1],"03").substr(2);b.algoid=g(f,0,[0,0],"06");if(b.algoid==="2a8648ce3d0201"){b.algparam=g(f,0,[0,1],"06");}return b};X509.KEYUSAGE_NAME=["digitalSignature","nonRepudiation","keyEncipherment","dataEncipherment","keyAgreement","keyCertSign","cRLSign","encipherOnly","decipherOnly"];
    if(typeof KJUR=="undefined"||!KJUR){KJUR={};}if(typeof KJUR.jws=="undefined"||!KJUR.jws){KJUR.jws={};}KJUR.jws.JWS=function(){var b=KJUR,a=b.jws.JWS,c=a.isSafeJSONString;this.parseJWS=function(g,j){if((this.parsedJWS!==undefined)&&(j||(this.parsedJWS.sigvalH!==undefined))){return}var i=g.match(/^([^.]+)\.([^.]+)\.([^.]+)$/);if(i==null){throw "JWS signature is not a form of 'Head.Payload.SigValue'."}var k=i[1];var e=i[2];var l=i[3];var n=k+"."+e;this.parsedJWS={};this.parsedJWS.headB64U=k;this.parsedJWS.payloadB64U=e;this.parsedJWS.sigvalB64U=l;this.parsedJWS.si=n;if(!j){var h=b64utohex(l);var f=parseBigInt(h,16);this.parsedJWS.sigvalH=h;this.parsedJWS.sigvalBI=f;}var d=b64utoutf8(k);var m=b64utoutf8(e);this.parsedJWS.headS=d;this.parsedJWS.payloadS=m;if(!c(d,this.parsedJWS,"headP")){throw "malformed JSON string for JWS Head: "+d}};};KJUR.jws.JWS.sign=function(i,v,y,z,a){var w=KJUR,m=w.jws,q=m.JWS,g=q.readSafeJSONString,p=q.isSafeJSONString,d=w.crypto,k=d.ECDSA,o=d.Mac,c=d.Signature,t=JSON;var s,j,n;if(typeof v!="string"&&typeof v!="object"){throw "spHeader must be JSON string or object: "+v}if(typeof v=="object"){j=v;s=t.stringify(j);}if(typeof v=="string"){s=v;if(!p(s)){throw "JWS Head is not safe JSON string: "+s}j=g(s);}n=y;if(typeof y=="object"){n=t.stringify(y);}if((i==""||i==null)&&j.alg!==undefined){i=j.alg;}if((i!=""&&i!=null)&&j.alg===undefined){j.alg=i;s=t.stringify(j);}if(i!==j.alg){throw "alg and sHeader.alg doesn't match: "+i+"!="+j.alg}var r=null;if(q.jwsalg2sigalg[i]===undefined){throw "unsupported alg name: "+i}else{r=q.jwsalg2sigalg[i];}var e=utf8tob64u(s);var l=utf8tob64u(n);var b=e+"."+l;var x="";if(r.substr(0,4)=="Hmac"){if(z===undefined){throw "mac key shall be specified for HS* alg"}var h=new o({alg:r,prov:"cryptojs",pass:z});h.updateString(b);x=h.doFinal();}else{if(r.indexOf("withECDSA")!=-1){var f=new c({alg:r});f.init(z,a);f.updateString(b);hASN1Sig=f.sign();x=KJUR.crypto.ECDSA.asn1SigToConcatSig(hASN1Sig);}else{if(r!="none"){var f=new c({alg:r});f.init(z,a);f.updateString(b);x=f.sign();}}}var u=hextob64u(x);return b+"."+u};KJUR.jws.JWS.verify=function(w,B,n){var x=KJUR,q=x.jws,t=q.JWS,i=t.readSafeJSONString,e=x.crypto,p=e.ECDSA,s=e.Mac,d=e.Signature,m;if(typeof RSAKey!==undefined){m=RSAKey;}var y=w.split(".");if(y.length!==3){return false}var f=y[0];var r=y[1];var c=f+"."+r;var A=b64utohex(y[2]);var l=i(b64utoutf8(y[0]));var k=null;var z=null;if(l.alg===undefined){throw "algorithm not specified in header"}else{k=l.alg;z=k.substr(0,2);}if(n!=null&&Object.prototype.toString.call(n)==="[object Array]"&&n.length>0){var b=":"+n.join(":")+":";if(b.indexOf(":"+k+":")==-1){throw "algorithm '"+k+"' not accepted in the list"}}if(k!="none"&&B===null){throw "key shall be specified to verify."}if(typeof B=="string"&&B.indexOf("-----BEGIN ")!=-1){B=KEYUTIL.getKey(B);}if(z=="RS"||z=="PS"){if(!(B instanceof m)){throw "key shall be a RSAKey obj for RS* and PS* algs"}}if(z=="ES"){if(!(B instanceof p)){throw "key shall be a ECDSA obj for ES* algs"}}var u=null;if(t.jwsalg2sigalg[l.alg]===undefined){throw "unsupported alg name: "+k}else{u=t.jwsalg2sigalg[k];}if(u=="none"){throw "not supported"}else{if(u.substr(0,4)=="Hmac"){var o=null;if(B===undefined){throw "hexadecimal key shall be specified for HMAC"}var j=new s({alg:u,pass:B});j.updateString(c);o=j.doFinal();return A==o}else{if(u.indexOf("withECDSA")!=-1){var h=null;try{h=p.concatSigToASN1Sig(A);}catch(v){return false}var g=new d({alg:u});g.init(B);g.updateString(c);return g.verify(h)}else{var g=new d({alg:u});g.init(B);g.updateString(c);return g.verify(A)}}}};KJUR.jws.JWS.parse=function(g){var c=g.split(".");var b={};var f,e,d;if(c.length!=2&&c.length!=3){throw "malformed sJWS: wrong number of '.' splitted elements"}f=c[0];e=c[1];if(c.length==3){d=c[2];}b.headerObj=KJUR.jws.JWS.readSafeJSONString(b64utoutf8(f));b.payloadObj=KJUR.jws.JWS.readSafeJSONString(b64utoutf8(e));b.headerPP=JSON.stringify(b.headerObj,null,"  ");if(b.payloadObj==null){b.payloadPP=b64utoutf8(e);}else{b.payloadPP=JSON.stringify(b.payloadObj,null,"  ");}if(d!==undefined){b.sigHex=b64utohex(d);}return b};KJUR.jws.JWS.verifyJWT=function(e,l,r){var d=KJUR,j=d.jws,o=j.JWS,n=o.readSafeJSONString,p=o.inArray,f=o.includedArray;var k=e.split(".");var c=k[0];var i=k[1];var m=b64utohex(k[2]);var h=n(b64utoutf8(c));var g=n(b64utoutf8(i));if(h.alg===undefined){return false}if(r.alg===undefined){throw "acceptField.alg shall be specified"}if(!p(h.alg,r.alg)){return false}if(g.iss!==undefined&&typeof r.iss==="object"){if(!p(g.iss,r.iss)){return false}}if(g.sub!==undefined&&typeof r.sub==="object"){if(!p(g.sub,r.sub)){return false}}if(g.aud!==undefined&&typeof r.aud==="object"){if(typeof g.aud=="string"){if(!p(g.aud,r.aud)){return false}}else{if(typeof g.aud=="object"){if(!f(g.aud,r.aud)){return false}}}}var b=j.IntDate.getNow();if(r.verifyAt!==undefined&&typeof r.verifyAt==="number"){b=r.verifyAt;}if(r.gracePeriod===undefined||typeof r.gracePeriod!=="number"){r.gracePeriod=0;}if(g.exp!==undefined&&typeof g.exp=="number"){if(g.exp+r.gracePeriod<b){return false}}if(g.nbf!==undefined&&typeof g.nbf=="number"){if(b<g.nbf-r.gracePeriod){return false}}if(g.iat!==undefined&&typeof g.iat=="number"){if(b<g.iat-r.gracePeriod){return false}}if(g.jti!==undefined&&r.jti!==undefined){if(g.jti!==r.jti){return false}}if(!o.verify(e,l,r.alg)){return false}return true};KJUR.jws.JWS.includedArray=function(b,a){var c=KJUR.jws.JWS.inArray;if(b===null){return false}if(typeof b!=="object"){return false}if(typeof b.length!=="number"){return false}for(var d=0;d<b.length;d++){if(!c(b[d],a)){return false}}return true};KJUR.jws.JWS.inArray=function(d,b){if(b===null){return false}if(typeof b!=="object"){return false}if(typeof b.length!=="number"){return false}for(var c=0;c<b.length;c++){if(b[c]==d){return true}}return false};KJUR.jws.JWS.jwsalg2sigalg={HS256:"HmacSHA256",HS384:"HmacSHA384",HS512:"HmacSHA512",RS256:"SHA256withRSA",RS384:"SHA384withRSA",RS512:"SHA512withRSA",ES256:"SHA256withECDSA",ES384:"SHA384withECDSA",PS256:"SHA256withRSAandMGF1",PS384:"SHA384withRSAandMGF1",PS512:"SHA512withRSAandMGF1",none:"none",};KJUR.jws.JWS.isSafeJSONString=function(c,b,d){var e=null;try{e=jsonParse(c);if(typeof e!="object"){return 0}if(e.constructor===Array){return 0}if(b){b[d]=e;}return 1}catch(a){return 0}};KJUR.jws.JWS.readSafeJSONString=function(b){var c=null;try{c=jsonParse(b);if(typeof c!="object"){return null}if(c.constructor===Array){return null}return c}catch(a){return null}};KJUR.jws.JWS.getEncodedSignatureValueFromJWS=function(b){var a=b.match(/^[^.]+\.[^.]+\.([^.]+)$/);if(a==null){throw "JWS signature is not a form of 'Head.Payload.SigValue'."}return a[1]};KJUR.jws.JWS.getJWKthumbprint=function(d){if(d.kty!=="RSA"&&d.kty!=="EC"&&d.kty!=="oct"){throw "unsupported algorithm for JWK Thumprint"}var a="{";if(d.kty==="RSA"){if(typeof d.n!="string"||typeof d.e!="string"){throw "wrong n and e value for RSA key"}a+='"e":"'+d.e+'",';a+='"kty":"'+d.kty+'",';a+='"n":"'+d.n+'"}';}else{if(d.kty==="EC"){if(typeof d.crv!="string"||typeof d.x!="string"||typeof d.y!="string"){throw "wrong crv, x and y value for EC key"}a+='"crv":"'+d.crv+'",';a+='"kty":"'+d.kty+'",';a+='"x":"'+d.x+'",';a+='"y":"'+d.y+'"}';}else{if(d.kty==="oct"){if(typeof d.k!="string"){throw "wrong k value for oct(symmetric) key"}a+='"kty":"'+d.kty+'",';a+='"k":"'+d.k+'"}';}}}var b=rstrtohex(a);var c=KJUR.crypto.Util.hashHex(b,"sha256");var e=hextob64u(c);return e};KJUR.jws.IntDate={};KJUR.jws.IntDate.get=function(c){var b=KJUR.jws.IntDate,d=b.getNow,a=b.getZulu;if(c=="now"){return d()}else{if(c=="now + 1hour"){return d()+60*60}else{if(c=="now + 1day"){return d()+60*60*24}else{if(c=="now + 1month"){return d()+60*60*24*30}else{if(c=="now + 1year"){return d()+60*60*24*365}else{if(c.match(/Z$/)){return a(c)}else{if(c.match(/^[0-9]+$/)){return parseInt(c)}}}}}}}throw "unsupported format: "+c};KJUR.jws.IntDate.getZulu=function(a){return zulutosec(a)};KJUR.jws.IntDate.getNow=function(){var a=~~(new Date()/1000);return a};KJUR.jws.IntDate.intDate2UTCString=function(a){var b=new Date(a*1000);return b.toUTCString()};KJUR.jws.IntDate.intDate2Zulu=function(e){var i=new Date(e*1000),h=("0000"+i.getUTCFullYear()).slice(-4),g=("00"+(i.getUTCMonth()+1)).slice(-2),b=("00"+i.getUTCDate()).slice(-2),a=("00"+i.getUTCHours()).slice(-2),c=("00"+i.getUTCMinutes()).slice(-2),f=("00"+i.getUTCSeconds()).slice(-2);return h+g+b+a+c+f+"Z"};
    const { EDSA } = KJUR.crypto;
    const { DSA } = KJUR.crypto;
    const { Signature } = KJUR.crypto;
    const { MessageDigest } =  KJUR.crypto;
    const { Mac } = KJUR.crypto;
    const { Cipher } =  KJUR.crypto;
    const _crypto =  KJUR.crypto;
    const { jws } = KJUR;

    const AllowedSigningAlgs = ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512'];

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    function getJoseUtil({ jws, KeyUtil, X509, crypto, hextob64u, b64tohex, AllowedSigningAlgs }) {
        return class JoseUtil {

            static parseJwt(jwt) {
                Log.debug("JoseUtil.parseJwt");
                try {
                    var token = jws.JWS.parse(jwt);
                    return {
                        header: token.headerObj,
                        payload: token.payloadObj
                    }
                } catch (e) {
                    Log.error(e);
                }
            }

            static validateJwt(jwt, key, issuer, audience, clockSkew, now, timeInsensitive) {
                Log.debug("JoseUtil.validateJwt");

                try {
                    if (key.kty === "RSA") {
                        if (key.e && key.n) {
                            key = KeyUtil.getKey(key);
                        } else if (key.x5c && key.x5c.length) {
                            var hex = b64tohex(key.x5c[0]);
                            key = X509.getPublicKeyFromCertHex(hex);
                        } else {
                            Log.error("JoseUtil.validateJwt: RSA key missing key material", key);
                            return Promise.reject(new Error("RSA key missing key material"));
                        }
                    } else if (key.kty === "EC") {
                        if (key.crv && key.x && key.y) {
                            key = KeyUtil.getKey(key);
                        } else {
                            Log.error("JoseUtil.validateJwt: EC key missing key material", key);
                            return Promise.reject(new Error("EC key missing key material"));
                        }
                    } else {
                        Log.error("JoseUtil.validateJwt: Unsupported key type", key && key.kty);
                        return Promise.reject(new Error("Unsupported key type: " + key && key.kty));
                    }

                    return JoseUtil._validateJwt(jwt, key, issuer, audience, clockSkew, now, timeInsensitive);
                } catch (e) {
                    Log.error(e && e.message || e);
                    return Promise.reject("JWT validation failed");
                }
            }

            static validateJwtAttributes(jwt, issuer, audience, clockSkew, now, timeInsensitive) {
                if (!clockSkew) {
                    clockSkew = 0;
                }

                if (!now) {
                    now = parseInt(Date.now() / 1000);
                }

                var payload = JoseUtil.parseJwt(jwt).payload;

                if (!payload.iss) {
                    Log.error("JoseUtil._validateJwt: issuer was not provided");
                    return Promise.reject(new Error("issuer was not provided"));
                }
                if (payload.iss !== issuer) {
                    Log.error("JoseUtil._validateJwt: Invalid issuer in token", payload.iss);
                    return Promise.reject(new Error("Invalid issuer in token: " + payload.iss));
                }

                if (!payload.aud) {
                    Log.error("JoseUtil._validateJwt: aud was not provided");
                    return Promise.reject(new Error("aud was not provided"));
                }
                var validAudience = payload.aud === audience || (Array.isArray(payload.aud) && payload.aud.indexOf(audience) >= 0);
                if (!validAudience) {
                    Log.error("JoseUtil._validateJwt: Invalid audience in token", payload.aud);
                    return Promise.reject(new Error("Invalid audience in token: " + payload.aud));
                }
                if (payload.azp && payload.azp !== audience) {
                    Log.error("JoseUtil._validateJwt: Invalid azp in token", payload.azp);
                    return Promise.reject(new Error("Invalid azp in token: " + payload.azp));
                }

                if (!timeInsensitive) {
                    var lowerNow = now + clockSkew;
                    var upperNow = now - clockSkew;

                    if (!payload.iat) {
                        Log.error("JoseUtil._validateJwt: iat was not provided");
                        return Promise.reject(new Error("iat was not provided"));
                    }
                    if (lowerNow < payload.iat) {
                        Log.error("JoseUtil._validateJwt: iat is in the future", payload.iat);
                        return Promise.reject(new Error("iat is in the future: " + payload.iat));
                    }

                    if (payload.nbf && lowerNow < payload.nbf) {
                        Log.error("JoseUtil._validateJwt: nbf is in the future", payload.nbf);
                        return Promise.reject(new Error("nbf is in the future: " + payload.nbf));
                    }

                    if (!payload.exp) {
                        Log.error("JoseUtil._validateJwt: exp was not provided");
                        return Promise.reject(new Error("exp was not provided"));
                    }
                    if (payload.exp < upperNow) {
                        Log.error("JoseUtil._validateJwt: exp is in the past", payload.exp);
                        return Promise.reject(new Error("exp is in the past:" + payload.exp));
                    }
                }

                return Promise.resolve(payload);
            }

            static _validateJwt(jwt, key, issuer, audience, clockSkew, now, timeInsensitive) {

                return JoseUtil.validateJwtAttributes(jwt, issuer, audience, clockSkew, now, timeInsensitive).then(payload => {
                    try {
                        if (!jws.JWS.verify(jwt, key, AllowedSigningAlgs)) {
                            Log.error("JoseUtil._validateJwt: signature validation failed");
                            return Promise.reject(new Error("signature validation failed"));
                        }

                        return payload;
                    } catch (e) {
                        Log.error(e && e.message || e);
                        return Promise.reject(new Error("signature validation failed"));
                    }
                });
            }

            static hashString(value, alg) {
                try {
                    return crypto.Util.hashString(value, alg);
                } catch (e) {
                    Log.error(e);
                }
            }

            static hexToBase64Url(value) {
                try {
                    return hextob64u(value);
                } catch (e) {
                    Log.error(e);
                }
            }
        }
    }

    const JoseUtil = getJoseUtil({ jws, KeyUtil: KEYUTIL, X509, crypto: _crypto, hextob64u, b64tohex, AllowedSigningAlgs });

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class UserInfoService {
        constructor(
            settings, 
            JsonServiceCtor = JsonService, 
            MetadataServiceCtor = MetadataService, 
            joseUtil = JoseUtil
        ) {
            if (!settings) {
                Log.error("UserInfoService.ctor: No settings passed");
                throw new Error("settings");
            }

            this._settings = settings;
            this._jsonService = new JsonServiceCtor(undefined, undefined, this._getClaimsFromJwt.bind(this));
            this._metadataService = new MetadataServiceCtor(this._settings);
            this._joseUtil = joseUtil;
        }

        getClaims(token) {
            if (!token) {
                Log.error("UserInfoService.getClaims: No token passed");
                return Promise.reject(new Error("A token is required"));
            }

            return this._metadataService.getUserInfoEndpoint().then(url => {
                Log.debug("UserInfoService.getClaims: received userinfo url", url);

                return this._jsonService.getJson(url, token).then(claims => {
                    Log.debug("UserInfoService.getClaims: claims received", claims);
                    return claims;
                });
            });
        }

        _getClaimsFromJwt(req) {
            try {
                let jwt = this._joseUtil.parseJwt(req.responseText);
                if (!jwt || !jwt.header || !jwt.payload) {
                    Log.error("UserInfoService._getClaimsFromJwt: Failed to parse JWT", jwt);
                    return Promise.reject(new Error("Failed to parse id_token"));
                }

                var kid = jwt.header.kid;

                let issuerPromise;
                switch (this._settings.userInfoJwtIssuer) {
                    case 'OP':
                        issuerPromise = this._metadataService.getIssuer();
                        break;
                    case 'ANY':
                        issuerPromise = Promise.resolve(jwt.payload.iss);
                        break;
                    default:
                        issuerPromise = Promise.resolve(this._settings.userInfoJwtIssuer);
                        break;
                }

                return issuerPromise.then(issuer => {
                    Log.debug("UserInfoService._getClaimsFromJwt: Received issuer:" + issuer);

                    return this._metadataService.getSigningKeys().then(keys => {
                        if (!keys) {
                            Log.error("UserInfoService._getClaimsFromJwt: No signing keys from metadata");
                            return Promise.reject(new Error("No signing keys from metadata"));
                        }

                        Log.debug("UserInfoService._getClaimsFromJwt: Received signing keys");
                        let key;
                        if (!kid) {
                            keys = this._filterByAlg(keys, jwt.header.alg);

                            if (keys.length > 1) {
                                Log.error("UserInfoService._getClaimsFromJwt: No kid found in id_token and more than one key found in metadata");
                                return Promise.reject(new Error("No kid found in id_token and more than one key found in metadata"));
                            }
                            else {
                                // kid is mandatory only when there are multiple keys in the referenced JWK Set document
                                // see http://openid.net/specs/openid-connect-core-1_0.html#Signing
                                key = keys[0];
                            }
                        }
                        else {
                            key = keys.filter(key => {
                                return key.kid === kid;
                            })[0];
                        }

                        if (!key) {
                            Log.error("UserInfoService._getClaimsFromJwt: No key matching kid or alg found in signing keys");
                            return Promise.reject(new Error("No key matching kid or alg found in signing keys"));
                        }

                        let audience = this._settings.client_id;

                        let clockSkewInSeconds = this._settings.clockSkew;
                        Log.debug("UserInfoService._getClaimsFromJwt: Validaing JWT; using clock skew (in seconds) of: ", clockSkewInSeconds);

                        return this._joseUtil.validateJwt(req.responseText, key, issuer, audience, clockSkewInSeconds, undefined, true).then(() => {
                            Log.debug("UserInfoService._getClaimsFromJwt: JWT validation successful");
                            return jwt.payload;
                        });
                    });
                });
                return;
            }
            catch (e) {
                Log.error("UserInfoService._getClaimsFromJwt: Error parsing JWT response", e.message);
                reject(e);
                return;
            }
        }

        _filterByAlg(keys, alg) {
            var kty = null;
            if (alg.startsWith("RS")) {
                kty = "RSA";
            }
            else if (alg.startsWith("PS")) {
                kty = "PS";
            }
            else if (alg.startsWith("ES")) {
                kty = "EC";
            }
            else {
                Log.debug("UserInfoService._filterByAlg: alg not supported: ", alg);
                return [];
            }

            Log.debug("UserInfoService._filterByAlg: Looking for keys that match kty: ", kty);

            keys = keys.filter(key => {
                return key.kty === kty;
            });

            Log.debug("UserInfoService._filterByAlg: Number of keys that match kty: ", kty, keys.length);

            return keys;
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class TokenClient {
        constructor(settings, JsonServiceCtor = JsonService, MetadataServiceCtor = MetadataService) {
            if (!settings) {
                Log.error("TokenClient.ctor: No settings passed");
                throw new Error("settings");
            }

            this._settings = settings;
            this._jsonService = new JsonServiceCtor();
            this._metadataService = new MetadataServiceCtor(this._settings);
        }

        exchangeCode(args = {}) {
            args = Object.assign({}, args);

            args.grant_type = args.grant_type || "authorization_code";
            args.client_id = args.client_id || this._settings.client_id;
            args.redirect_uri = args.redirect_uri || this._settings.redirect_uri;

            if (!args.code) {
                Log.error("TokenClient.exchangeCode: No code passed");
                return Promise.reject(new Error("A code is required"));
            }
            if (!args.redirect_uri) {
                Log.error("TokenClient.exchangeCode: No redirect_uri passed");
                return Promise.reject(new Error("A redirect_uri is required"));
            }
            if (!args.code_verifier) {
                Log.error("TokenClient.exchangeCode: No code_verifier passed");
                return Promise.reject(new Error("A code_verifier is required"));
            }
            if (!args.client_id) {
                Log.error("TokenClient.exchangeCode: No client_id passed");
                return Promise.reject(new Error("A client_id is required"));
            }

            return this._metadataService.getTokenEndpoint(false).then(url => {
                Log.debug("TokenClient.exchangeCode: Received token endpoint");

                return this._jsonService.postForm(url, args).then(response => {
                    Log.debug("TokenClient.exchangeCode: response received");
                    return response;
                });
            });
        }

        exchangeRefreshToken(args = {}) {
            args = Object.assign({}, args);

            args.grant_type = args.grant_type || "refresh_token";
            args.client_id = args.client_id || this._settings.client_id;
            args.client_secret = args.client_secret || this._settings.client_secret;

            if (!args.refresh_token) {
                Log.error("TokenClient.exchangeRefreshToken: No refresh_token passed");
                return Promise.reject(new Error("A refresh_token is required"));
            }
            if (!args.client_id) {
                Log.error("TokenClient.exchangeRefreshToken: No client_id passed");
                return Promise.reject(new Error("A client_id is required"));
            }

            return this._metadataService.getTokenEndpoint(false).then(url => {
                Log.debug("TokenClient.exchangeRefreshToken: Received token endpoint");

                return this._jsonService.postForm(url, args).then(response => {
                    Log.debug("TokenClient.exchangeRefreshToken: response received");
                    return response;
                });
            });
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class ErrorResponse extends Error {
        constructor({error, error_description, error_uri, state, session_state}={}
        ) {
             if (!error){
                Log.error("No error passed to ErrorResponse");
                throw new Error("error");
            }

            super(error_description || error);

            this.name = "ErrorResponse";

            this.error = error;
            this.error_description = error_description;
            this.error_uri = error_uri;

            this.state = state;
            this.session_state = session_state;
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const ProtocolClaims = ["nonce", "at_hash", "iat", "nbf", "exp", "aud", "iss", "c_hash"];

    class ResponseValidator {

        constructor(settings, 
            MetadataServiceCtor = MetadataService,
            UserInfoServiceCtor = UserInfoService, 
            joseUtil = JoseUtil,
            TokenClientCtor = TokenClient) {
            if (!settings) {
                Log.error("ResponseValidator.ctor: No settings passed to ResponseValidator");
                throw new Error("settings");
            }

            this._settings = settings;
            this._metadataService = new MetadataServiceCtor(this._settings);
            this._userInfoService = new UserInfoServiceCtor(this._settings);
            this._joseUtil = joseUtil;
            this._tokenClient = new TokenClientCtor(this._settings);
        }

        validateSigninResponse(state, response) {
            Log.debug("ResponseValidator.validateSigninResponse");

            return this._processSigninParams(state, response).then(response => {
                Log.debug("ResponseValidator.validateSigninResponse: state processed");
                return this._validateTokens(state, response).then(response => {
                    Log.debug("ResponseValidator.validateSigninResponse: tokens validated");
                    return this._processClaims(state, response).then(response => {
                        Log.debug("ResponseValidator.validateSigninResponse: claims processed");
                        return response;
                    });
                });
            });
        }

        validateSignoutResponse(state, response) {
            if (state.id !== response.state) {
                Log.error("ResponseValidator.validateSignoutResponse: State does not match");
                return Promise.reject(new Error("State does not match"));
            }

            // now that we know the state matches, take the stored data
            // and set it into the response so callers can get their state
            // this is important for both success & error outcomes
            Log.debug("ResponseValidator.validateSignoutResponse: state validated");
            response.state = state.data;

            if (response.error) {
                Log.warn("ResponseValidator.validateSignoutResponse: Response was error", response.error);
                return Promise.reject(new ErrorResponse(response));
            }

            return Promise.resolve(response);
        }

        _processSigninParams(state, response) {
            if (state.id !== response.state) {
                Log.error("ResponseValidator._processSigninParams: State does not match");
                return Promise.reject(new Error("State does not match"));
            }

            if (!state.client_id) {
                Log.error("ResponseValidator._processSigninParams: No client_id on state");
                return Promise.reject(new Error("No client_id on state"));
            }

            if (!state.authority) {
                Log.error("ResponseValidator._processSigninParams: No authority on state");
                return Promise.reject(new Error("No authority on state"));
            }

            // this allows the authority to be loaded from the signin state
            if (!this._settings.authority) {
                this._settings.authority = state.authority;
            }
            // ensure we're using the correct authority if the authority is not loaded from signin state
            else if (this._settings.authority && this._settings.authority !== state.authority) {
                Log.error("ResponseValidator._processSigninParams: authority mismatch on settings vs. signin state");
                return Promise.reject(new Error("authority mismatch on settings vs. signin state"));
            }
            // this allows the client_id to be loaded from the signin state
            if (!this._settings.client_id) {
                this._settings.client_id = state.client_id;
            }
            // ensure we're using the correct client_id if the client_id is not loaded from signin state
            else if (this._settings.client_id && this._settings.client_id !== state.client_id) {
                Log.error("ResponseValidator._processSigninParams: client_id mismatch on settings vs. signin state");
                return Promise.reject(new Error("client_id mismatch on settings vs. signin state"));
            }

            // now that we know the state matches, take the stored data
            // and set it into the response so callers can get their state
            // this is important for both success & error outcomes
            Log.debug("ResponseValidator._processSigninParams: state validated");
            response.state = state.data;

            if (response.error) {
                Log.warn("ResponseValidator._processSigninParams: Response was error", response.error);
                return Promise.reject(new ErrorResponse(response));
            }

            if (state.nonce && !response.id_token) {
                Log.error("ResponseValidator._processSigninParams: Expecting id_token in response");
                return Promise.reject(new Error("No id_token in response"));
            }

            if (!state.nonce && response.id_token) {
                Log.error("ResponseValidator._processSigninParams: Not expecting id_token in response");
                return Promise.reject(new Error("Unexpected id_token in response"));
            }

            if (state.code_verifier && !response.code) {
                Log.error("ResponseValidator._processSigninParams: Expecting code in response");
                return Promise.reject(new Error("No code in response"));
            }

            if (!state.code_verifier && response.code) {
                Log.error("ResponseValidator._processSigninParams: Not expecting code in response");
                return Promise.reject(new Error("Unexpected code in response"));
            }

            if (!response.scope) {
                // if there's no scope on the response, then assume all scopes granted (per-spec) and copy over scopes from original request
                response.scope = state.scope;
            }

            return Promise.resolve(response);
        }

        _processClaims(state, response) {
            if (response.isOpenIdConnect) {
                Log.debug("ResponseValidator._processClaims: response is OIDC, processing claims");

                response.profile = this._filterProtocolClaims(response.profile);

                if (state.skipUserInfo !== true && this._settings.loadUserInfo && response.access_token) {
                    Log.debug("ResponseValidator._processClaims: loading user info");

                    return this._userInfoService.getClaims(response.access_token).then(claims => {
                        Log.debug("ResponseValidator._processClaims: user info claims received from user info endpoint");

                        if (claims.sub !== response.profile.sub) {
                            Log.error("ResponseValidator._processClaims: sub from user info endpoint does not match sub in access_token");
                            return Promise.reject(new Error("sub from user info endpoint does not match sub in access_token"));
                        }

                        response.profile = this._mergeClaims(response.profile, claims);
                        Log.debug("ResponseValidator._processClaims: user info claims received, updated profile:", response.profile);

                        return response;
                    });
                }
                else {
                    Log.debug("ResponseValidator._processClaims: not loading user info");
                }
            }
            else {
                Log.debug("ResponseValidator._processClaims: response is not OIDC, not processing claims");
            }

            return Promise.resolve(response);
        }

        _mergeClaims(claims1, claims2) {
            var result = Object.assign({}, claims1);

            for (let name in claims2) {
                var values = claims2[name];
                if (!Array.isArray(values)) {
                    values = [values];
                }

                for (let i = 0; i < values.length; i++) {
                    let value = values[i];
                    if (!result[name]) {
                        result[name] = value;
                    }
                    else if (Array.isArray(result[name])) {
                        if (result[name].indexOf(value) < 0) {
                            result[name].push(value);
                        }
                    }
                    else if (result[name] !== value) {
                        if (typeof value === 'object') {
                            result[name] = this._mergeClaims(result[name], value);
                        } 
                        else {
                            result[name] = [result[name], value];
                        }
                    }
                }
            }

            return result;
        }

        _filterProtocolClaims(claims) {
            Log.debug("ResponseValidator._filterProtocolClaims, incoming claims:", claims);

            var result = Object.assign({}, claims);

            if (this._settings._filterProtocolClaims) {
                ProtocolClaims.forEach(type => {
                    delete result[type];
                });

                Log.debug("ResponseValidator._filterProtocolClaims: protocol claims filtered", result);
            }
            else {
                Log.debug("ResponseValidator._filterProtocolClaims: protocol claims not filtered");
            }

            return result;
        }

        _validateTokens(state, response) {
            if (response.code) {
                Log.debug("ResponseValidator._validateTokens: Validating code");
                return this._processCode(state, response);
            }

            if (response.id_token) {
                if (response.access_token) {
                    Log.debug("ResponseValidator._validateTokens: Validating id_token and access_token");
                    return this._validateIdTokenAndAccessToken(state, response);
                }

                Log.debug("ResponseValidator._validateTokens: Validating id_token");
                return this._validateIdToken(state, response);
            }

            Log.debug("ResponseValidator._validateTokens: No code to process or id_token to validate");
            return Promise.resolve(response);
        }

        _processCode(state, response) {
            var request = {
                client_id: state.client_id,
                client_secret: state.client_secret,
                code : response.code,
                redirect_uri: state.redirect_uri,
                code_verifier: state.code_verifier
            };

            if (state.extraTokenParams && typeof(state.extraTokenParams) === 'object') {
                Object.assign(request, state.extraTokenParams);
            }
            
            return this._tokenClient.exchangeCode(request).then(tokenResponse => {
                
                for(var key in tokenResponse) {
                    response[key] = tokenResponse[key];
                }

                if (response.id_token) {
                    Log.debug("ResponseValidator._processCode: token response successful, processing id_token");
                    return this._validateIdTokenAttributes(state, response);
                }
                else {
                    Log.debug("ResponseValidator._processCode: token response successful, returning response");
                }
                
                return response;
            });
        }

        _validateIdTokenAttributes(state, response) {
            return this._metadataService.getIssuer().then(issuer => {

                let audience = state.client_id;
                let clockSkewInSeconds = this._settings.clockSkew;
                Log.debug("ResponseValidator._validateIdTokenAttributes: Validaing JWT attributes; using clock skew (in seconds) of: ", clockSkewInSeconds);

                return this._joseUtil.validateJwtAttributes(response.id_token, issuer, audience, clockSkewInSeconds).then(payload => {
                
                    if (state.nonce && state.nonce !== payload.nonce) {
                        Log.error("ResponseValidator._validateIdTokenAttributes: Invalid nonce in id_token");
                        return Promise.reject(new Error("Invalid nonce in id_token"));
                    }

                    if (!payload.sub) {
                        Log.error("ResponseValidator._validateIdTokenAttributes: No sub present in id_token");
                        return Promise.reject(new Error("No sub present in id_token"));
                    }

                    response.profile = payload;
                    return response;
                });
            });
        }

        _validateIdTokenAndAccessToken(state, response) {
            return this._validateIdToken(state, response).then(response => {
                return this._validateAccessToken(response);
            });
        }

        _validateIdToken(state, response) {
            if (!state.nonce) {
                Log.error("ResponseValidator._validateIdToken: No nonce on state");
                return Promise.reject(new Error("No nonce on state"));
            }

            let jwt = this._joseUtil.parseJwt(response.id_token);
            if (!jwt || !jwt.header || !jwt.payload) {
                Log.error("ResponseValidator._validateIdToken: Failed to parse id_token", jwt);
                return Promise.reject(new Error("Failed to parse id_token"));
            }

            if (state.nonce !== jwt.payload.nonce) {
                Log.error("ResponseValidator._validateIdToken: Invalid nonce in id_token");
                return Promise.reject(new Error("Invalid nonce in id_token"));
            }

            var kid = jwt.header.kid;

            return this._metadataService.getIssuer().then(issuer => {
                Log.debug("ResponseValidator._validateIdToken: Received issuer");

                return this._metadataService.getSigningKeys().then(keys => {
                    if (!keys) {
                        Log.error("ResponseValidator._validateIdToken: No signing keys from metadata");
                        return Promise.reject(new Error("No signing keys from metadata"));
                    }

                    Log.debug("ResponseValidator._validateIdToken: Received signing keys");
                    let key;
                    if (!kid) {
                        keys = this._filterByAlg(keys, jwt.header.alg);

                        if (keys.length > 1) {
                            Log.error("ResponseValidator._validateIdToken: No kid found in id_token and more than one key found in metadata");
                            return Promise.reject(new Error("No kid found in id_token and more than one key found in metadata"));
                        }
                        else {
                            // kid is mandatory only when there are multiple keys in the referenced JWK Set document
                            // see http://openid.net/specs/openid-connect-core-1_0.html#Signing
                            key = keys[0];
                        }
                    }
                    else {
                        key = keys.filter(key => {
                            return key.kid === kid;
                        })[0];
                    }

                    if (!key) {
                        Log.error("ResponseValidator._validateIdToken: No key matching kid or alg found in signing keys");
                        return Promise.reject(new Error("No key matching kid or alg found in signing keys"));
                    }

                    let audience = state.client_id;

                    let clockSkewInSeconds = this._settings.clockSkew;
                    Log.debug("ResponseValidator._validateIdToken: Validaing JWT; using clock skew (in seconds) of: ", clockSkewInSeconds);

                    return this._joseUtil.validateJwt(response.id_token, key, issuer, audience, clockSkewInSeconds).then(()=>{
                        Log.debug("ResponseValidator._validateIdToken: JWT validation successful");

                        if (!jwt.payload.sub) {
                            Log.error("ResponseValidator._validateIdToken: No sub present in id_token");
                            return Promise.reject(new Error("No sub present in id_token"));
                        }

                        response.profile = jwt.payload;

                        return response;
                    });
                });
            });
        }

        _filterByAlg(keys, alg){
            var kty = null;
            if (alg.startsWith("RS")) {
                kty = "RSA";
            }
            else if (alg.startsWith("PS")) {
                kty = "PS";
            }
            else if (alg.startsWith("ES")) {
                kty = "EC";
            }
            else {
                Log.debug("ResponseValidator._filterByAlg: alg not supported: ", alg);
                return [];
            }

            Log.debug("ResponseValidator._filterByAlg: Looking for keys that match kty: ", kty);

            keys = keys.filter(key => {
                return key.kty === kty;
            });

            Log.debug("ResponseValidator._filterByAlg: Number of keys that match kty: ", kty, keys.length);

            return keys;
        }

        _validateAccessToken(response) {
            if (!response.profile) {
                Log.error("ResponseValidator._validateAccessToken: No profile loaded from id_token");
                return Promise.reject(new Error("No profile loaded from id_token"));
            }

            if (!response.profile.at_hash) {
                Log.error("ResponseValidator._validateAccessToken: No at_hash in id_token");
                return Promise.reject(new Error("No at_hash in id_token"));
            }

            if (!response.id_token) {
                Log.error("ResponseValidator._validateAccessToken: No id_token");
                return Promise.reject(new Error("No id_token"));
            }

            let jwt = this._joseUtil.parseJwt(response.id_token);
            if (!jwt || !jwt.header) {
                Log.error("ResponseValidator._validateAccessToken: Failed to parse id_token", jwt);
                return Promise.reject(new Error("Failed to parse id_token"));
            }

            var hashAlg = jwt.header.alg;
            if (!hashAlg || hashAlg.length !== 5) {
                Log.error("ResponseValidator._validateAccessToken: Unsupported alg:", hashAlg);
                return Promise.reject(new Error("Unsupported alg: " + hashAlg));
            }

            var hashBits = hashAlg.substr(2, 3);
            if (!hashBits) {
                Log.error("ResponseValidator._validateAccessToken: Unsupported alg:", hashAlg, hashBits);
                return Promise.reject(new Error("Unsupported alg: " + hashAlg));
            }

            hashBits = parseInt(hashBits);
            if (hashBits !== 256 && hashBits !== 384 && hashBits !== 512) {
                Log.error("ResponseValidator._validateAccessToken: Unsupported alg:", hashAlg, hashBits);
                return Promise.reject(new Error("Unsupported alg: " + hashAlg));
            }

            let sha = "sha" + hashBits;
            var hash = this._joseUtil.hashString(response.access_token, sha);
            if (!hash) {
                Log.error("ResponseValidator._validateAccessToken: access_token hash failed:", sha);
                return Promise.reject(new Error("Failed to validate at_hash"));
            }

            var left = hash.substr(0, hash.length / 2);
            var left_b64u = this._joseUtil.hexToBase64Url(left);
            if (left_b64u !== response.profile.at_hash) {
                Log.error("ResponseValidator._validateAccessToken: Failed to validate at_hash", left_b64u, response.profile.at_hash);
                return Promise.reject(new Error("Failed to validate at_hash"));
            }

            Log.debug("ResponseValidator._validateAccessToken: success");

            return Promise.resolve(response);
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const OidcMetadataUrlPath$1 = '.well-known/openid-configuration';

    const DefaultResponseType = "id_token";
    const DefaultScope = "openid";
    const DefaultStaleStateAge = 60 * 15; // seconds
    const DefaultClockSkewInSeconds = 60 * 5;

    class OidcClientSettings {
        constructor({
            // metadata related
            authority, metadataUrl, metadata, signingKeys,
            // client related
            client_id, client_secret, response_type = DefaultResponseType, scope = DefaultScope,
            redirect_uri, post_logout_redirect_uri,
            // optional protocol
            prompt, display, max_age, ui_locales, acr_values, resource, response_mode,
            // behavior flags
            filterProtocolClaims = true, loadUserInfo = true,
            staleStateAge = DefaultStaleStateAge, clockSkew = DefaultClockSkewInSeconds,
            userInfoJwtIssuer = 'OP',
            // other behavior
            stateStore = new WebStorageStateStore(),
            ResponseValidatorCtor = ResponseValidator,
            MetadataServiceCtor = MetadataService,
            // extra query params
            extraQueryParams = {},
            extraTokenParams = {}
        } = {}) {

            this._authority = authority;
            this._metadataUrl = metadataUrl;
            this._metadata = metadata;
            this._signingKeys = signingKeys;

            this._client_id = client_id;
            this._client_secret = client_secret;
            this._response_type = response_type;
            this._scope = scope;
            this._redirect_uri = redirect_uri;
            this._post_logout_redirect_uri = post_logout_redirect_uri;

            this._prompt = prompt;
            this._display = display;
            this._max_age = max_age;
            this._ui_locales = ui_locales;
            this._acr_values = acr_values;
            this._resource = resource;
            this._response_mode = response_mode;

            this._filterProtocolClaims = !!filterProtocolClaims;
            this._loadUserInfo = !!loadUserInfo;
            this._staleStateAge = staleStateAge;
            this._clockSkew = clockSkew;
            this._userInfoJwtIssuer = userInfoJwtIssuer;

            this._stateStore = stateStore;
            this._validator = new ResponseValidatorCtor(this);
            this._metadataService = new MetadataServiceCtor(this);

            this._extraQueryParams = typeof extraQueryParams === 'object' ? extraQueryParams : {};
            this._extraTokenParams = typeof extraTokenParams === 'object' ? extraTokenParams : {};
        }

        // client config
        get client_id() {
            return this._client_id;
        }
        set client_id(value) {
            if (!this._client_id) {
                // one-time set only
                this._client_id = value;
            }
            else {
                Log.error("OidcClientSettings.set_client_id: client_id has already been assigned.");
                throw new Error("client_id has already been assigned.")
            }
        }
        get client_secret() {
            return this._client_secret;
        }
        get response_type() {
            return this._response_type;
        }
        get scope() {
            return this._scope;
        }
        get redirect_uri() {
            return this._redirect_uri;
        }
        get post_logout_redirect_uri() {
            return this._post_logout_redirect_uri;
        }


        // optional protocol params
        get prompt() {
            return this._prompt;
        }
        get display() {
            return this._display;
        }
        get max_age() {
            return this._max_age;
        }
        get ui_locales() {
            return this._ui_locales;
        }
        get acr_values() {
            return this._acr_values;
        }
        get resource() {
            return this._resource;
        }
        get response_mode() {
            return this._response_mode;
        }


        // metadata
        get authority() {
            return this._authority;
        }
        set authority(value) {
            if (!this._authority) {
                // one-time set only
                this._authority = value;
            }
            else {
                Log.error("OidcClientSettings.set_authority: authority has already been assigned.");
                throw new Error("authority has already been assigned.")
            }
        }
        get metadataUrl() {
            if (!this._metadataUrl) {
                this._metadataUrl = this.authority;

                if (this._metadataUrl && this._metadataUrl.indexOf(OidcMetadataUrlPath$1) < 0) {
                    if (this._metadataUrl[this._metadataUrl.length - 1] !== '/') {
                        this._metadataUrl += '/';
                    }
                    this._metadataUrl += OidcMetadataUrlPath$1;
                }
            }

            return this._metadataUrl;
        }

        // settable/cachable metadata values
        get metadata() {
            return this._metadata;
        }
        set metadata(value) {
            this._metadata = value;
        }

        get signingKeys() {
            return this._signingKeys;
        }
        set signingKeys(value) {
            this._signingKeys = value;
        }

        // behavior flags
        get filterProtocolClaims() {
            return this._filterProtocolClaims;
        }
        get loadUserInfo() {
            return this._loadUserInfo;
        }
        get staleStateAge() {
            return this._staleStateAge;
        }
        get clockSkew() {
            return this._clockSkew;
        }
        get userInfoJwtIssuer() {
            return this._userInfoJwtIssuer;
        }

        get stateStore() {
            return this._stateStore;
        }
        get validator() {
            return this._validator;
        }
        get metadataService() {
            return this._metadataService;
        }

        // extra query params
        get extraQueryParams() {
            return this._extraQueryParams;
        }
        set extraQueryParams(value) {
            if (typeof value === 'object'){
                this._extraQueryParams = value;
            } else {
                this._extraQueryParams = {};
            }
        }

        // extra token params
        get extraTokenParams() {
            return this._extraTokenParams;
        }
        set extraTokenParams(value) {
            if (typeof value === 'object'){
                this._extraTokenParams = value;
            } else {
                this._extraTokenParams = {};
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class UrlUtility {
        static addQueryParam(url, name, value) {
            if (url.indexOf('?') < 0) {
                url += "?";
            }

            if (url[url.length - 1] !== "?") {
                url += "&";
            }

            url += encodeURIComponent(name);
            url += "=";
            url += encodeURIComponent(value);

            return url;
        }

        static parseUrlFragment(value, delimiter = "#", global = Global) {
            if (typeof value !== 'string'){
                value = global.location.href;
            }

            var idx = value.lastIndexOf(delimiter);
            if (idx >= 0) {
                value = value.substr(idx + 1);
            }

            if (delimiter === "?") {
                // if we're doing query, then strip off hash fragment before we parse
                idx = value.indexOf('#');
                if (idx >= 0) {
                    value = value.substr(0, idx);
                }
            }

            var params = {},
                regex = /([^&=]+)=([^&]*)/g,
                m;

            var counter = 0;
            while (m = regex.exec(value)) {
                params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
                if (counter++ > 50) {
                    Log.error("UrlUtility.parseUrlFragment: response exceeded expected number of parameters", value);
                    return {
                        error: "Response exceeded expected number of parameters"
                    };
                }
            }

            for (var prop in params) {
                return params;
            }

            return {};
        }
    }

    var rngBrowser = createCommonjsModule(function (module) {
    // Unique ID creation requires a high quality random # generator.  In the
    // browser this is a little complicated due to unknown quality of Math.random()
    // and inconsistent support for the `crypto` API.  We do the best we can via
    // feature-detection

    // getRandomValues needs to be invoked in a context where "this" is a Crypto
    // implementation. Also, find the complete implementation of crypto on IE11.
    var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto)) ||
                          (typeof(msCrypto) != 'undefined' && typeof window.msCrypto.getRandomValues == 'function' && msCrypto.getRandomValues.bind(msCrypto));

    if (getRandomValues) {
      // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
      var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

      module.exports = function whatwgRNG() {
        getRandomValues(rnds8);
        return rnds8;
      };
    } else {
      // Math.random()-based (RNG)
      //
      // If all else fails, use Math.random().  It's fast, but is of unspecified
      // quality.
      var rnds = new Array(16);

      module.exports = function mathRNG() {
        for (var i = 0, r; i < 16; i++) {
          if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
          rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
        }

        return rnds;
      };
    }
    });

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */
    var byteToHex = [];
    for (var i = 0; i < 256; ++i) {
      byteToHex[i] = (i + 0x100).toString(16).substr(1);
    }

    function bytesToUuid(buf, offset) {
      var i = offset || 0;
      var bth = byteToHex;
      // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
      return ([bth[buf[i++]], bth[buf[i++]], 
    	bth[buf[i++]], bth[buf[i++]], '-',
    	bth[buf[i++]], bth[buf[i++]], '-',
    	bth[buf[i++]], bth[buf[i++]], '-',
    	bth[buf[i++]], bth[buf[i++]], '-',
    	bth[buf[i++]], bth[buf[i++]],
    	bth[buf[i++]], bth[buf[i++]],
    	bth[buf[i++]], bth[buf[i++]]]).join('');
    }

    var bytesToUuid_1 = bytesToUuid;

    function v4(options, buf, offset) {
      var i = buf && offset || 0;

      if (typeof(options) == 'string') {
        buf = options === 'binary' ? new Array(16) : null;
        options = null;
      }
      options = options || {};

      var rnds = options.random || (options.rng || rngBrowser)();

      // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
      rnds[6] = (rnds[6] & 0x0f) | 0x40;
      rnds[8] = (rnds[8] & 0x3f) | 0x80;

      // Copy bytes to buffer, if provided
      if (buf) {
        for (var ii = 0; ii < 16; ++ii) {
          buf[i + ii] = rnds[ii];
        }
      }

      return buf || bytesToUuid_1(rnds);
    }

    var v4_1 = v4;

    /**
     * Generates RFC4122 version 4 guid ()
     */

    function random() {
      return v4_1().replace(/-/g, '');
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class State {
        constructor({id, data, created, request_type} = {}) {
            this._id = id || random();
            this._data = data;

            if (typeof created === 'number' && created > 0) {
                this._created = created;
            }
            else {
                this._created = parseInt(Date.now() / 1000);
            }
            this._request_type =  request_type;
        }

        get id() {
            return this._id;
        }
        get data() {
            return this._data;
        }
        get created() {
            return this._created;
        }
        get request_type() {
            return this._request_type;
        }

        toStorageString() {
            Log.debug("State.toStorageString");
            return JSON.stringify({
                id: this.id,
                data: this.data,
                created: this.created,
                request_type: this.request_type
            });
        }

        static fromStorageString(storageString) {
            Log.debug("State.fromStorageString");
            return new State(JSON.parse(storageString));
        }

        static clearStaleState(storage, age) {

            var cutoff = Date.now() / 1000 - age;

            return storage.getAllKeys().then(keys => {
                Log.debug("State.clearStaleState: got keys", keys);

                var promises = [];
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    var p = storage.get(key).then(item => {
                        let remove = false;

                        if (item) {
                            try {
                                var state = State.fromStorageString(item);

                                Log.debug("State.clearStaleState: got item from key: ", key, state.created);

                                if (state.created <= cutoff) {
                                    remove = true;
                                }
                            }
                            catch (e) {
                                Log.error("State.clearStaleState: Error parsing state for key", key, e.message);
                                remove = true;
                            }
                        }
                        else {
                            Log.debug("State.clearStaleState: no item in storage for key: ", key);
                            remove = true;
                        }

                        if (remove) {
                            Log.debug("State.clearStaleState: removed item for key: ", key);
                            return storage.remove(key);
                        }
                    });

                    promises.push(p);
                }

                Log.debug("State.clearStaleState: waiting on promise count:", promises.length);
                return Promise.all(promises);
            });
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class SigninState extends State {
        constructor({nonce, authority, client_id, redirect_uri, code_verifier, response_mode, client_secret, scope, extraTokenParams, skipUserInfo} = {}) {
            super(arguments[0]);

            if (nonce === true) {
                this._nonce = random();
            }
            else if (nonce) {
                this._nonce = nonce;
            }

            if (code_verifier === true) {
                // random() produces 32 length
                this._code_verifier = random() + random() + random();
            }
            else if (code_verifier) {
                this._code_verifier = code_verifier;
            }
            
            if (this.code_verifier) {
                let hash = JoseUtil.hashString(this.code_verifier, "SHA256");
                this._code_challenge = JoseUtil.hexToBase64Url(hash);
            }

            this._redirect_uri = redirect_uri;
            this._authority = authority;
            this._client_id = client_id;
            this._response_mode = response_mode;
            this._client_secret = client_secret;
            this._scope = scope;
            this._extraTokenParams = extraTokenParams;
            this._skipUserInfo = skipUserInfo;
        }

        get nonce() {
            return this._nonce;
        }
        get authority() {
            return this._authority;
        }
        get client_id() {
            return this._client_id;
        }
        get redirect_uri() {
            return this._redirect_uri;
        }
        get code_verifier() {
            return this._code_verifier;
        }
        get code_challenge() {
            return this._code_challenge;
        }
        get response_mode() {
            return this._response_mode;
        }
        get client_secret() {
            return this._client_secret;
        }
        get scope() {
            return this._scope;
        }
        get extraTokenParams() {
            return this._extraTokenParams;
        }
        get skipUserInfo() {
            return this._skipUserInfo;
        }
        
        toStorageString() {
            Log.debug("SigninState.toStorageString");
            return JSON.stringify({
                id: this.id,
                data: this.data,
                created: this.created,
                request_type: this.request_type,
                nonce: this.nonce,
                code_verifier: this.code_verifier,
                redirect_uri: this.redirect_uri,
                authority: this.authority,
                client_id: this.client_id,
                response_mode: this.response_mode,
                client_secret: this.client_secret,
                scope: this.scope,
                extraTokenParams : this.extraTokenParams,
                skipUserInfo: this.skipUserInfo
            });
        }

        static fromStorageString(storageString) {
            Log.debug("SigninState.fromStorageString");
            var data = JSON.parse(storageString);
            return new SigninState(data);
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class SigninRequest {
        constructor({
            // mandatory
            url, client_id, redirect_uri, response_type, scope, authority,
            // optional
            data, prompt, display, max_age, ui_locales, id_token_hint, login_hint, acr_values, resource, response_mode,
            request, request_uri, extraQueryParams, request_type, client_secret, extraTokenParams, skipUserInfo
        }) {
            if (!url) {
                Log.error("SigninRequest.ctor: No url passed");
                throw new Error("url");
            }
            if (!client_id) {
                Log.error("SigninRequest.ctor: No client_id passed");
                throw new Error("client_id");
            }
            if (!redirect_uri) {
                Log.error("SigninRequest.ctor: No redirect_uri passed");
                throw new Error("redirect_uri");
            }
            if (!response_type) {
                Log.error("SigninRequest.ctor: No response_type passed");
                throw new Error("response_type");
            }
            if (!scope) {
                Log.error("SigninRequest.ctor: No scope passed");
                throw new Error("scope");
            }
            if (!authority) {
                Log.error("SigninRequest.ctor: No authority passed");
                throw new Error("authority");
            }

            let oidc = SigninRequest.isOidc(response_type);
            let code = SigninRequest.isCode(response_type);

            if (!response_mode) {
                response_mode = SigninRequest.isCode(response_type) ? "query" : null;
            }

            this.state = new SigninState({ nonce: oidc, 
                data, client_id, authority, redirect_uri, 
                code_verifier: code, 
                request_type, response_mode,
                client_secret, scope, extraTokenParams, skipUserInfo });

            url = UrlUtility.addQueryParam(url, "client_id", client_id);
            url = UrlUtility.addQueryParam(url, "redirect_uri", redirect_uri);
            url = UrlUtility.addQueryParam(url, "response_type", response_type);
            url = UrlUtility.addQueryParam(url, "scope", scope);

            url = UrlUtility.addQueryParam(url, "state", this.state.id);
            if (oidc) {
                url = UrlUtility.addQueryParam(url, "nonce", this.state.nonce);
            }
            if (code) {
                url = UrlUtility.addQueryParam(url, "code_challenge", this.state.code_challenge);
                url = UrlUtility.addQueryParam(url, "code_challenge_method", "S256");
            }

            var optional = { prompt, display, max_age, ui_locales, id_token_hint, login_hint, acr_values, resource, request, request_uri, response_mode };
            for(let key in optional){
                if (optional[key]) {
                    url = UrlUtility.addQueryParam(url, key, optional[key]);
                }
            }

            for(let key in extraQueryParams){
                url = UrlUtility.addQueryParam(url, key, extraQueryParams[key]);
            }

            this.url = url;
        }

        static isOidc(response_type) {
            var result = response_type.split(/\s+/g).filter(function(item) {
                return item === "id_token";
            });
            return !!(result[0]);
        }

        static isOAuth(response_type) {
            var result = response_type.split(/\s+/g).filter(function(item) {
                return item === "token";
            });
            return !!(result[0]);
        }
        
        static isCode(response_type) {
            var result = response_type.split(/\s+/g).filter(function(item) {
                return item === "code";
            });
            return !!(result[0]);
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const OidcScope = "openid";

    class SigninResponse {
        constructor(url, delimiter = "#") {

            var values = UrlUtility.parseUrlFragment(url, delimiter);

            this.error = values.error;
            this.error_description = values.error_description;
            this.error_uri = values.error_uri;

            this.code = values.code;
            this.state = values.state;
            this.id_token = values.id_token;
            this.session_state = values.session_state;
            this.access_token = values.access_token;
            this.token_type = values.token_type;
            this.scope = values.scope;
            this.profile = undefined; // will be set from ResponseValidator

            this.expires_in = values.expires_in;
        }

        get expires_in() {
            if (this.expires_at) {
                let now = parseInt(Date.now() / 1000);
                return this.expires_at - now;
            }
            return undefined;
        }
        set expires_in(value){
            let expires_in = parseInt(value);
            if (typeof expires_in === 'number' && expires_in > 0) {
                let now = parseInt(Date.now() / 1000);
                this.expires_at = now + expires_in;
            }
        }

        get expired() {
            let expires_in = this.expires_in;
            if (expires_in !== undefined) {
                return expires_in <= 0;
            }
            return undefined;
        }

        get scopes() {
            return (this.scope || "").split(" ");
        }

        get isOpenIdConnect() {
            return this.scopes.indexOf(OidcScope) >= 0 || !!this.id_token;
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class SignoutRequest {
        constructor({url, id_token_hint, post_logout_redirect_uri, data, extraQueryParams, request_type}) {
            if (!url) {
                Log.error("SignoutRequest.ctor: No url passed");
                throw new Error("url");
            }

            if (id_token_hint) {
                url = UrlUtility.addQueryParam(url, "id_token_hint", id_token_hint);
            }

            if (post_logout_redirect_uri) {
                url = UrlUtility.addQueryParam(url, "post_logout_redirect_uri", post_logout_redirect_uri);

                if (data) {
                    this.state = new State({ data, request_type });

                    url = UrlUtility.addQueryParam(url, "state", this.state.id);
                }
            }

            for(let key in extraQueryParams){
                url = UrlUtility.addQueryParam(url, key, extraQueryParams[key]);
            }

            this.url = url;
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class SignoutResponse {
        constructor(url) {

            var values = UrlUtility.parseUrlFragment(url, "?");

            this.error = values.error;
            this.error_description = values.error_description;
            this.error_uri = values.error_uri;

            this.state = values.state;
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class OidcClient {
        constructor(settings = {}) {
            if (settings instanceof OidcClientSettings) {
                this._settings = settings;
            }
            else {
                this._settings = new OidcClientSettings(settings);
            }
        }

        get _stateStore() {
            return this.settings.stateStore;
        }
        get _validator() {
            return this.settings.validator;
        }
        get _metadataService() {
            return this.settings.metadataService;
        }

        get settings() {
            return this._settings;
        }
        get metadataService() {
            return this._metadataService;
        }

        createSigninRequest({
            response_type, scope, redirect_uri,
            // data was meant to be the place a caller could indicate the data to
            // have round tripped, but people were getting confused, so i added state (since that matches the spec)
            // and so now if data is not passed, but state is then state will be used
            data, state, prompt, display, max_age, ui_locales, id_token_hint, login_hint, acr_values,
            resource, request, request_uri, response_mode, extraQueryParams, extraTokenParams, request_type, skipUserInfo } = {},
            stateStore
        ) {
            Log.debug("OidcClient.createSigninRequest");

            let client_id = this._settings.client_id;
            response_type = response_type || this._settings.response_type;
            scope = scope || this._settings.scope;
            redirect_uri = redirect_uri || this._settings.redirect_uri;

            // id_token_hint, login_hint aren't allowed on _settings
            prompt = prompt || this._settings.prompt;
            display = display || this._settings.display;
            max_age = max_age || this._settings.max_age;
            ui_locales = ui_locales || this._settings.ui_locales;
            acr_values = acr_values || this._settings.acr_values;
            resource = resource || this._settings.resource;
            response_mode = response_mode || this._settings.response_mode;
            extraQueryParams = extraQueryParams || this._settings.extraQueryParams;
            extraTokenParams = extraTokenParams || this._settings.extraTokenParams;

            let authority = this._settings.authority;

            if (SigninRequest.isCode(response_type) && response_type !== "code") {
                return Promise.reject(new Error("OpenID Connect hybrid flow is not supported"));
            }

            return this._metadataService.getAuthorizationEndpoint().then(url => {
                Log.debug("OidcClient.createSigninRequest: Received authorization endpoint", url);

                let signinRequest = new SigninRequest({
                    url,
                    client_id,
                    redirect_uri,
                    response_type,
                    scope,
                    data: data || state,
                    authority,
                    prompt, display, max_age, ui_locales, id_token_hint, login_hint, acr_values,
                    resource, request, request_uri, extraQueryParams, extraTokenParams, request_type, response_mode,
                    client_secret: this._settings.client_secret,
                    skipUserInfo
                });

                var signinState = signinRequest.state;
                stateStore = stateStore || this._stateStore;

                return stateStore.set(signinState.id, signinState.toStorageString()).then(() => {
                    return signinRequest;
                });
            });
        }

        readSigninResponseState(url, stateStore, removeState = false) {
            Log.debug("OidcClient.readSigninResponseState");

            let useQuery = this._settings.response_mode === "query" || 
                (!this._settings.response_mode && SigninRequest.isCode(this._settings.response_type));
            let delimiter = useQuery ? "?" : "#";

            var response = new SigninResponse(url, delimiter);

            if (!response.state) {
                Log.error("OidcClient.readSigninResponseState: No state in response");
                return Promise.reject(new Error("No state in response"));
            }

            stateStore = stateStore || this._stateStore;

            var stateApi = removeState ? stateStore.remove.bind(stateStore) : stateStore.get.bind(stateStore);

            return stateApi(response.state).then(storedStateString => {
                if (!storedStateString) {
                    Log.error("OidcClient.readSigninResponseState: No matching state found in storage");
                    throw new Error("No matching state found in storage");
                }

                let state = SigninState.fromStorageString(storedStateString);
                return {state, response};
            });
        }

        processSigninResponse(url, stateStore) {
            Log.debug("OidcClient.processSigninResponse");

            return this.readSigninResponseState(url, stateStore, true).then(({state, response}) => {
                Log.debug("OidcClient.processSigninResponse: Received state from storage; validating response");
                return this._validator.validateSigninResponse(state, response);
            });
        }

        createSignoutRequest({id_token_hint, data, state, post_logout_redirect_uri, extraQueryParams, request_type } = {},
            stateStore
        ) {
            Log.debug("OidcClient.createSignoutRequest");

            post_logout_redirect_uri = post_logout_redirect_uri || this._settings.post_logout_redirect_uri;
            extraQueryParams = extraQueryParams || this._settings.extraQueryParams;

            return this._metadataService.getEndSessionEndpoint().then(url => {
                if (!url) {
                    Log.error("OidcClient.createSignoutRequest: No end session endpoint url returned");
                    throw new Error("no end session endpoint");
                }

                Log.debug("OidcClient.createSignoutRequest: Received end session endpoint", url);

                let request = new SignoutRequest({
                    url,
                    id_token_hint,
                    post_logout_redirect_uri,
                    data: data || state,
                    extraQueryParams,
                    request_type
                });

                var signoutState = request.state;
                if (signoutState) {
                    Log.debug("OidcClient.createSignoutRequest: Signout request has state to persist");

                    stateStore = stateStore || this._stateStore;
                    stateStore.set(signoutState.id, signoutState.toStorageString());
                }

                return request;
            });
        }

        readSignoutResponseState(url, stateStore, removeState = false) {
            Log.debug("OidcClient.readSignoutResponseState");

            var response = new SignoutResponse(url);
            if (!response.state) {
                Log.debug("OidcClient.readSignoutResponseState: No state in response");

                if (response.error) {
                    Log.warn("OidcClient.readSignoutResponseState: Response was error: ", response.error);
                    return Promise.reject(new ErrorResponse(response));
                }

                return Promise.resolve({undefined, response});
            }

            var stateKey = response.state;

            stateStore = stateStore || this._stateStore;

            var stateApi = removeState ? stateStore.remove.bind(stateStore) : stateStore.get.bind(stateStore);
            return stateApi(stateKey).then(storedStateString => {
                if (!storedStateString) {
                    Log.error("OidcClient.readSignoutResponseState: No matching state found in storage");
                    throw new Error("No matching state found in storage");
                }

                let state = State.fromStorageString(storedStateString);

                return {state, response};
            });
        }

        processSignoutResponse(url, stateStore) {
            Log.debug("OidcClient.processSignoutResponse");

            return this.readSignoutResponseState(url, stateStore, true).then(({state, response}) => {
                if (state) {
                    Log.debug("OidcClient.processSignoutResponse: Received state from storage; validating response");
                    return this._validator.validateSignoutResponse(state, response);
                }
                else {
                    Log.debug("OidcClient.processSignoutResponse: No state from storage; skipping validating response");
                    return response;
                }
            });
        }

        clearStaleState(stateStore) {
            Log.debug("OidcClient.clearStaleState");

            stateStore = stateStore || this._stateStore;

            return State.clearStaleState(stateStore, this.settings.staleStateAge);
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class InMemoryWebStorage{
        constructor(){
            this._data = {};
        }

        getItem(key) {
            Log.debug("InMemoryWebStorage.getItem", key);
            return this._data[key];
        }

        setItem(key, value){
            Log.debug("InMemoryWebStorage.setItem", key);
            this._data[key] = value;
        }

        removeItem(key){
            Log.debug("InMemoryWebStorage.removeItem", key);
            delete this._data[key];
        }

        get length() {
            return Object.getOwnPropertyNames(this._data).length;
        }

        key(index) {
            return Object.getOwnPropertyNames(this._data)[index];
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class RedirectNavigator {

        prepare() {
            return Promise.resolve(this);
        }

        navigate(params) {
            if (!params || !params.url) {
                Log.error("RedirectNavigator.navigate: No url provided");
                return Promise.reject(new Error("No url provided"));
            }

            if (params.useReplaceToNavigate) {
                window.location.replace(params.url);
            }
            else {
                window.location = params.url;
            }

            return Promise.resolve();
        }

        get url() {
            return window.location.href;
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const CheckForPopupClosedInterval = 500;
    const DefaultPopupFeatures = 'location=no,toolbar=no,width=500,height=500,left=100,top=100;';
    //const DefaultPopupFeatures = 'location=no,toolbar=no,width=500,height=500,left=100,top=100;resizable=yes';

    const DefaultPopupTarget = "_blank";

    class PopupWindow {

        constructor(params) {
            this._promise = new Promise((resolve, reject) => {
                this._resolve = resolve;
                this._reject = reject;
            });

            let target = params.popupWindowTarget || DefaultPopupTarget;
            let features = params.popupWindowFeatures || DefaultPopupFeatures;

            this._popup = window.open('', target, features);
            if (this._popup) {
                Log.debug("PopupWindow.ctor: popup successfully created");
                this._checkForPopupClosedTimer = window.setInterval(this._checkForPopupClosed.bind(this), CheckForPopupClosedInterval);
            }
        }

        get promise() {
            return this._promise;
        }

        navigate(params) {
            if (!this._popup) {
                this._error("PopupWindow.navigate: Error opening popup window");
            }
            else if (!params || !params.url) {
                this._error("PopupWindow.navigate: no url provided");
                this._error("No url provided");
            }
            else {
                Log.debug("PopupWindow.navigate: Setting URL in popup");

                this._id = params.id;
                if (this._id) {
                    window["popupCallback_" + params.id] = this._callback.bind(this);
                }

                this._popup.focus();
                this._popup.window.location = params.url;
            }

            return this.promise;
        }

        _success(data) {
            Log.debug("PopupWindow.callback: Successful response from popup window");

            this._cleanup();
            this._resolve(data);
        }
        _error(message) {
            Log.error("PopupWindow.error: ", message);
            
            this._cleanup();
            this._reject(new Error(message));
        }

        close() {
            this._cleanup(false);
        }

        _cleanup(keepOpen) {
            Log.debug("PopupWindow.cleanup");

            window.clearInterval(this._checkForPopupClosedTimer);
            this._checkForPopupClosedTimer = null;

            delete window["popupCallback_" + this._id];

            if (this._popup && !keepOpen) {
                this._popup.close();
            }
            this._popup = null;
        }

        _checkForPopupClosed() {
            if (!this._popup || this._popup.closed) {
                this._error("Popup window closed");
            }
        }

        _callback(url, keepOpen) {
            this._cleanup(keepOpen);

            if (url) {
                Log.debug("PopupWindow.callback success");
                this._success({ url: url });
            }
            else {
                Log.debug("PopupWindow.callback: Invalid response from popup");
                this._error("Invalid response from popup");
            }
        }

        static notifyOpener(url, keepOpen, delimiter) {
            if (window.opener) {
                url = url || window.location.href;
                if (url) {
                    var data = UrlUtility.parseUrlFragment(url, delimiter);

                    if (data.state) {
                        var name = "popupCallback_" + data.state;
                        var callback = window.opener[name];
                        if (callback) {
                            Log.debug("PopupWindow.notifyOpener: passing url message to opener");
                            callback(url, keepOpen);
                        }
                        else {
                            Log.warn("PopupWindow.notifyOpener: no matching callback found on opener");
                        }
                    }
                    else {
                        Log.warn("PopupWindow.notifyOpener: no state found in response url");
                    }
                }
            }
            else {
                Log.warn("PopupWindow.notifyOpener: no window.opener. Can't complete notification.");
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class PopupNavigator {

        prepare(params) {
            let popup = new PopupWindow(params);
            return Promise.resolve(popup);
        }

        callback(url, keepOpen, delimiter) {
            Log.debug("PopupNavigator.callback");

            try {
                PopupWindow.notifyOpener(url, keepOpen, delimiter);
                return Promise.resolve();
            }
            catch (e) {
                return Promise.reject(e);
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const DefaultTimeout = 10000;

    class IFrameWindow {

        constructor(params) {
            this._promise = new Promise((resolve, reject) => {
                this._resolve = resolve;
                this._reject = reject;
            });

            this._boundMessageEvent = this._message.bind(this);
            window.addEventListener("message", this._boundMessageEvent, false);

            this._frame = window.document.createElement("iframe");

            // shotgun approach
            this._frame.style.visibility = "hidden";
            this._frame.style.position = "absolute";
            this._frame.style.display = "none";
            this._frame.style.width = 0;
            this._frame.style.height = 0;

            window.document.body.appendChild(this._frame);
        }

        navigate(params) {
            if (!params || !params.url) {
                this._error("No url provided");
            }
            else {
                let timeout = params.silentRequestTimeout || DefaultTimeout;
                Log.debug("IFrameWindow.navigate: Using timeout of:", timeout);
                this._timer = window.setTimeout(this._timeout.bind(this), timeout);
                this._frame.src = params.url;
            }

            return this.promise;
        }

        get promise() {
            return this._promise;
        }

        _success(data) {
            this._cleanup();

            Log.debug("IFrameWindow: Successful response from frame window");
            this._resolve(data);
        }
        _error(message) {
            this._cleanup();

            Log.error(message);
            this._reject(new Error(message));
        }

        close() {
            this._cleanup();
        }

        _cleanup() {
            if (this._frame) {
                Log.debug("IFrameWindow: cleanup");

                window.removeEventListener("message", this._boundMessageEvent, false);
                window.clearTimeout(this._timer);
                window.document.body.removeChild(this._frame);

                this._timer = null;
                this._frame = null;
                this._boundMessageEvent = null;
            }
        }

        _timeout() {
            Log.debug("IFrameWindow.timeout");
            this._error("Frame window timed out");
        }

        _message(e) {
            Log.debug("IFrameWindow.message");

            if (this._timer &&
                e.origin === this._origin &&
                e.source === this._frame.contentWindow
            ) {
                let url = e.data;
                if (url) {
                    this._success({ url: url });
                }
                else {
                    this._error("Invalid response from frame");
                }
            }
        }

        get _origin() {
            return location.protocol + "//" + location.host;
        }

        static notifyParent(url) {
            Log.debug("IFrameWindow.notifyParent");
            if (window.frameElement) {
                url = url || window.location.href;
                if (url) {
                    Log.debug("IFrameWindow.notifyParent: posting url message to parent");
                    window.parent.postMessage(url, location.protocol + "//" + location.host);
                }
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class IFrameNavigator {

        prepare(params) {
            Log.debug("IFrameNavigator.prepare");
            let frame = new IFrameWindow(params);
            return Promise.resolve(frame);
        }

        callback(url) {
            Log.debug("IFrameNavigator.callback");

            try {
                IFrameWindow.notifyParent(url);
                return Promise.resolve();
            }
            catch (e) {
                return Promise.reject(e);
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const DefaultAccessTokenExpiringNotificationTime = 60;
    const DefaultCheckSessionInterval = 2000;

    class UserManagerSettings extends OidcClientSettings {
        constructor({
            popup_redirect_uri,
            popup_post_logout_redirect_uri,
            popupWindowFeatures,
            popupWindowTarget,
            silent_redirect_uri,
            silentRequestTimeout,
            automaticSilentRenew = false,
            validateSubOnSilentRenew = false,
            includeIdTokenInSilentRenew = true,
            monitorSession = true,
            monitorAnonymousSession = false,
            checkSessionInterval = DefaultCheckSessionInterval,
            stopCheckSessionOnError = true,
            query_status_response_type,
            revokeAccessTokenOnSignout = false,
            accessTokenExpiringNotificationTime = DefaultAccessTokenExpiringNotificationTime,
            redirectNavigator = new RedirectNavigator(),
            popupNavigator = new PopupNavigator(),
            iframeNavigator = new IFrameNavigator(),
            userStore = new WebStorageStateStore({ store: Global.sessionStorage })
        } = {}) {
            super(arguments[0]);

            this._popup_redirect_uri = popup_redirect_uri;
            this._popup_post_logout_redirect_uri = popup_post_logout_redirect_uri;
            this._popupWindowFeatures = popupWindowFeatures;
            this._popupWindowTarget = popupWindowTarget;

            this._silent_redirect_uri = silent_redirect_uri;
            this._silentRequestTimeout = silentRequestTimeout;
            this._automaticSilentRenew = automaticSilentRenew;
            this._validateSubOnSilentRenew = validateSubOnSilentRenew;
            this._includeIdTokenInSilentRenew = includeIdTokenInSilentRenew;
            this._accessTokenExpiringNotificationTime = accessTokenExpiringNotificationTime;

            this._monitorSession = monitorSession;
            this._monitorAnonymousSession = monitorAnonymousSession;
            this._checkSessionInterval = checkSessionInterval;
            this._stopCheckSessionOnError = stopCheckSessionOnError;
            if (query_status_response_type) {
                this._query_status_response_type = query_status_response_type;
            } 
            else if (arguments[0] && arguments[0].response_type) {
                this._query_status_response_type = SigninRequest.isOidc(arguments[0].response_type) ? "id_token" : "code";
            }
            else {
                this._query_status_response_type = "id_token";
            }
            this._revokeAccessTokenOnSignout = revokeAccessTokenOnSignout;

            this._redirectNavigator = redirectNavigator;
            this._popupNavigator = popupNavigator;
            this._iframeNavigator = iframeNavigator;

            this._userStore = userStore;
        }

        get popup_redirect_uri() {
            return this._popup_redirect_uri;
        }
        get popup_post_logout_redirect_uri() {
            return this._popup_post_logout_redirect_uri;
        }
        get popupWindowFeatures() {
            return this._popupWindowFeatures;
        }
        get popupWindowTarget() {
            return this._popupWindowTarget;
        }

        get silent_redirect_uri() {
            return this._silent_redirect_uri;
        }
         get silentRequestTimeout() {
            return this._silentRequestTimeout;
        }
        get automaticSilentRenew() {
            return this._automaticSilentRenew;
        }
        get validateSubOnSilentRenew() {
            return this._validateSubOnSilentRenew;
        }
        get includeIdTokenInSilentRenew() {
            return this._includeIdTokenInSilentRenew;
        }
        get accessTokenExpiringNotificationTime() {
            return this._accessTokenExpiringNotificationTime;
        }

        get monitorSession() {
            return this._monitorSession;
        }
        get monitorAnonymousSession() {
            return this._monitorAnonymousSession;
        }
        get checkSessionInterval() {
            return this._checkSessionInterval;
        }
        get stopCheckSessionOnError(){
            return this._stopCheckSessionOnError;
        }
        get query_status_response_type(){
            return this._query_status_response_type;
        }
        get revokeAccessTokenOnSignout() {
            return this._revokeAccessTokenOnSignout;
        }

        get redirectNavigator() {
            return this._redirectNavigator;
        }
        get popupNavigator() {
            return this._popupNavigator;
        }
        get iframeNavigator() {
            return this._iframeNavigator;
        }

        get userStore() {
            return this._userStore;
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class User {
        constructor({id_token, session_state, access_token, refresh_token, token_type, scope, profile, expires_at, state}) {
            this.id_token = id_token;
            this.session_state = session_state;
            this.access_token = access_token;
            this.refresh_token = refresh_token;
            this.token_type = token_type;
            this.scope = scope;
            this.profile = profile;
            this.expires_at = expires_at;
            this.state = state;
        }

        get expires_in() {
            if (this.expires_at) {
                let now = parseInt(Date.now() / 1000);
                return this.expires_at - now;
            }
            return undefined;
        }
        set expires_in(value) {
            let expires_in = parseInt(value);
            if (typeof expires_in === 'number' && expires_in > 0) {
                let now = parseInt(Date.now() / 1000);
                this.expires_at = now + expires_in;
            }
        }

        get expired() {
            let expires_in = this.expires_in;
            if (expires_in !== undefined) {
                return expires_in <= 0;
            }
            return undefined;
        }

        get scopes() {
            return (this.scope || "").split(" ");
        }

        toStorageString() {
            Log.debug("User.toStorageString");
            return JSON.stringify({
                id_token: this.id_token,
                session_state: this.session_state,
                access_token: this.access_token,
                refresh_token: this.refresh_token,
                token_type: this.token_type,
                scope: this.scope,
                profile: this.profile,
                expires_at: this.expires_at
            });
        }

        static fromStorageString(storageString) {
            Log.debug("User.fromStorageString");
            return new User(JSON.parse(storageString));
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class Event {

        constructor(name) {
            this._name = name;
            this._callbacks = [];
        }

        addHandler(cb) {
            this._callbacks.push(cb);
        }

        removeHandler(cb) {
            var idx = this._callbacks.findIndex(item => item === cb);
            if (idx >= 0) {
                this._callbacks.splice(idx, 1);
            }
        }

        raise(...params) {
            Log.debug("Event: Raising event: " + this._name);
            for (let i = 0; i < this._callbacks.length; i++) {
                this._callbacks[i](...params);
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const TimerDuration = 5; // seconds

    class Timer extends Event {

        constructor(name, timer = Global.timer, nowFunc = undefined) {
            super(name);
            this._timer = timer;

            if (nowFunc) {
                this._nowFunc = nowFunc;
            }
            else {
                this._nowFunc = () => Date.now() / 1000;
            }
        }

        get now() {
            return parseInt(this._nowFunc());
        }

        init(duration) {
            if (duration <= 0) {
                duration = 1;
            }
            duration = parseInt(duration);

            var expiration = this.now + duration;
            if (this.expiration === expiration && this._timerHandle) {
                // no need to reinitialize to same expiration, so bail out
                Log.debug("Timer.init timer " + this._name + " skipping initialization since already initialized for expiration:", this.expiration);
                return;
            }

            this.cancel();

            Log.debug("Timer.init timer " + this._name + " for duration:", duration);
            this._expiration = expiration;

            // we're using a fairly short timer and then checking the expiration in the
            // callback to handle scenarios where the browser device sleeps, and then
            // the timers end up getting delayed.
            var timerDuration = TimerDuration;
            if (duration < timerDuration) {
                timerDuration = duration;
            }
            this._timerHandle = this._timer.setInterval(this._callback.bind(this), timerDuration * 1000);
        }
        
        get expiration() {
            return this._expiration;
        }

        cancel() {
            if (this._timerHandle) {
                Log.debug("Timer.cancel: ", this._name);
                this._timer.clearInterval(this._timerHandle);
                this._timerHandle = null;
            }
        }

        _callback() {
            var diff = this._expiration - this.now;
            Log.debug("Timer.callback; " + this._name + " timer expires in:", diff);

            if (this._expiration <= this.now) {
                this.cancel();
                super.raise();
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const DefaultAccessTokenExpiringNotificationTime$1 = 60; // seconds

    class AccessTokenEvents {

        constructor({
            accessTokenExpiringNotificationTime = DefaultAccessTokenExpiringNotificationTime$1,
            accessTokenExpiringTimer = new Timer("Access token expiring"),
            accessTokenExpiredTimer = new Timer("Access token expired")
        } = {}) {
            this._accessTokenExpiringNotificationTime = accessTokenExpiringNotificationTime;

            this._accessTokenExpiring = accessTokenExpiringTimer;
            this._accessTokenExpired = accessTokenExpiredTimer;
        }

        load(container) {
            // only register events if there's an access token and it has an expiration
            if (container.access_token && container.expires_in !== undefined) {
                let duration = container.expires_in;
                Log.debug("AccessTokenEvents.load: access token present, remaining duration:", duration);

                if (duration > 0) {
                    // only register expiring if we still have time
                    let expiring = duration - this._accessTokenExpiringNotificationTime;
                    if (expiring <= 0){
                        expiring = 1;
                    }
                    
                    Log.debug("AccessTokenEvents.load: registering expiring timer in:", expiring);
                    this._accessTokenExpiring.init(expiring);
                }
                else {
                    Log.debug("AccessTokenEvents.load: canceling existing expiring timer becase we're past expiration.");
                    this._accessTokenExpiring.cancel();
                }

                // if it's negative, it will still fire
                let expired = duration + 1;
                Log.debug("AccessTokenEvents.load: registering expired timer in:", expired);
                this._accessTokenExpired.init(expired);
            }
            else {
                this._accessTokenExpiring.cancel();
                this._accessTokenExpired.cancel();
            }
        }

        unload() {
            Log.debug("AccessTokenEvents.unload: canceling existing access token timers");
            this._accessTokenExpiring.cancel();
            this._accessTokenExpired.cancel();
        }

        addAccessTokenExpiring(cb) {
            this._accessTokenExpiring.addHandler(cb);
        }
        removeAccessTokenExpiring(cb) {
            this._accessTokenExpiring.removeHandler(cb);
        }

        addAccessTokenExpired(cb) {
            this._accessTokenExpired.addHandler(cb);
        }
        removeAccessTokenExpired(cb) {
            this._accessTokenExpired.removeHandler(cb);
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class UserManagerEvents extends AccessTokenEvents {

        constructor(settings) {
            super(settings);
            this._userLoaded = new Event("User loaded");
            this._userUnloaded = new Event("User unloaded");
            this._silentRenewError = new Event("Silent renew error");
            this._userSignedIn = new Event("User signed in");
            this._userSignedOut = new Event("User signed out");
            this._userSessionChanged = new Event("User session changed");
        }

        load(user, raiseEvent=true) {
            Log.debug("UserManagerEvents.load");
            super.load(user);
            if (raiseEvent) {
                this._userLoaded.raise(user);
            }
        }
        unload() {
            Log.debug("UserManagerEvents.unload");
            super.unload();
            this._userUnloaded.raise();
        }

        addUserLoaded(cb) {
            this._userLoaded.addHandler(cb);
        }
        removeUserLoaded(cb) {
            this._userLoaded.removeHandler(cb);
        }

        addUserUnloaded(cb) {
            this._userUnloaded.addHandler(cb);
        }
        removeUserUnloaded(cb) {
            this._userUnloaded.removeHandler(cb);
        }

        addSilentRenewError(cb) {
            this._silentRenewError.addHandler(cb);
        }
        removeSilentRenewError(cb) {
            this._silentRenewError.removeHandler(cb);
        }
        _raiseSilentRenewError(e) {
            Log.debug("UserManagerEvents._raiseSilentRenewError", e.message);
            this._silentRenewError.raise(e);
        }

        addUserSignedIn(cb) {
            this._userSignedIn.addHandler(cb);
        }
        removeUserSignedIn(cb) {
            this._userSignedIn.removeHandler(cb);
        }
        _raiseUserSignedIn() {
            Log.debug("UserManagerEvents._raiseUserSignedIn");
            this._userSignedIn.raise();
        }

        addUserSignedOut(cb) {
            this._userSignedOut.addHandler(cb);
        }
        removeUserSignedOut(cb) {
            this._userSignedOut.removeHandler(cb);
        }
        _raiseUserSignedOut() {
            Log.debug("UserManagerEvents._raiseUserSignedOut");
            this._userSignedOut.raise();
        }

        addUserSessionChanged(cb) {
            this._userSessionChanged.addHandler(cb);
        }
        removeUserSessionChanged(cb) {
            this._userSessionChanged.removeHandler(cb);
        }
        _raiseUserSessionChanged() {
            Log.debug("UserManagerEvents._raiseUserSessionChanged");
            this._userSessionChanged.raise();
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class SilentRenewService {

        constructor(userManager) {
            this._userManager = userManager;
        }

        start() {
            if (!this._callback) {
                this._callback = this._tokenExpiring.bind(this);
                this._userManager.events.addAccessTokenExpiring(this._callback);

                // this will trigger loading of the user so the expiring events can be initialized
                this._userManager.getUser().then(user=>{
                    // deliberate nop
                }).catch(err=>{
                    // catch to suppress errors since we're in a ctor
                    Log.error("SilentRenewService.start: Error from getUser:", err.message);
                });
            }
        }

        stop() {
            if (this._callback) {
                this._userManager.events.removeAccessTokenExpiring(this._callback);
                delete this._callback;
            }
        }

        _tokenExpiring() {
            this._userManager.signinSilent().then(user => {
                Log.debug("SilentRenewService._tokenExpiring: Silent token renewal successful");
            }, err => {
                Log.error("SilentRenewService._tokenExpiring: Error from signinSilent:", err.message);
                this._userManager.events._raiseSilentRenewError(err);
            });
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const DefaultInterval = 2000;

    class CheckSessionIFrame {
        constructor(callback, client_id, url, interval, stopOnError = true) {
            this._callback = callback;
            this._client_id = client_id;
            this._url = url;
            this._interval = interval || DefaultInterval;
            this._stopOnError = stopOnError;

            var idx = url.indexOf("/", url.indexOf("//") + 2);
            this._frame_origin = url.substr(0, idx);

            this._frame = window.document.createElement("iframe");

            // shotgun approach
            this._frame.style.visibility = "hidden";
            this._frame.style.position = "absolute";
            this._frame.style.display = "none";
            this._frame.style.width = 0;
            this._frame.style.height = 0;

            this._frame.src = url;
        }
        load() {
            return new Promise((resolve) => {
                this._frame.onload = () => {
                    resolve();
                };

                window.document.body.appendChild(this._frame);
                this._boundMessageEvent = this._message.bind(this);
                window.addEventListener("message", this._boundMessageEvent, false);
            });
        }
        _message(e) {
            if (e.origin === this._frame_origin &&
                e.source === this._frame.contentWindow
            ) {
                if (e.data === "error") {
                    Log.error("CheckSessionIFrame: error message from check session op iframe");
                    if (this._stopOnError) {
                        this.stop();
                    }
                }
                else if (e.data === "changed") {
                    Log.debug("CheckSessionIFrame: changed message from check session op iframe");
                    this.stop();
                    this._callback();
                }
                else {
                    Log.debug("CheckSessionIFrame: " + e.data + " message from check session op iframe");
                }
            }
        }
        start(session_state) {
            if (this._session_state !== session_state) {
                Log.debug("CheckSessionIFrame.start");

                this.stop();

                this._session_state = session_state;

                let send = () => {
                    this._frame.contentWindow.postMessage(this._client_id + " " + this._session_state, this._frame_origin);
                };
                
                // trigger now
                send();

                // and setup timer
                this._timer = window.setInterval(send, this._interval);
            }
        }

        stop() {
            this._session_state = null;

            if (this._timer) {
                Log.debug("CheckSessionIFrame.stop");

                window.clearInterval(this._timer);
                this._timer = null;
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class SessionMonitor {

        constructor(userManager, CheckSessionIFrameCtor = CheckSessionIFrame, timer = Global.timer) {
            if (!userManager) {
                Log.error("SessionMonitor.ctor: No user manager passed to SessionMonitor");
                throw new Error("userManager");
            }

            this._userManager = userManager;
            this._CheckSessionIFrameCtor = CheckSessionIFrameCtor;
            this._timer = timer;

            this._userManager.events.addUserLoaded(this._start.bind(this));
            this._userManager.events.addUserUnloaded(this._stop.bind(this));

            this._userManager.getUser().then(user => {
                // doing this manually here since calling getUser 
                // doesn't trigger load event.
                if (user) {
                    this._start(user);
                }
                else if (this._settings.monitorAnonymousSession) {
                    this._userManager.querySessionStatus().then(session => {
                        let tmpUser = {
                            session_state : session.session_state
                        };
                        if (session.sub && session.sid) {
                            tmpUser.profile = {
                                sub: session.sub,
                                sid: session.sid
                            };
                        }
                        this._start(tmpUser);
                    })
                    .catch(err => {
                        // catch to suppress errors since we're in a ctor
                        Log.error("SessionMonitor ctor: error from querySessionStatus:", err.message);
                    });
                }
            }).catch(err => {
                // catch to suppress errors since we're in a ctor
                Log.error("SessionMonitor ctor: error from getUser:", err.message);
            });
        }

        get _settings() {
            return this._userManager.settings;
        }
        get _metadataService() {
            return this._userManager.metadataService;
        }
        get _client_id() {
            return this._settings.client_id;
        }
        get _checkSessionInterval() {
            return this._settings.checkSessionInterval;
        }
        get _stopCheckSessionOnError() {
            return this._settings.stopCheckSessionOnError;
        }

        _start(user) {
            let session_state = user.session_state;

            if (session_state) {
                if (user.profile) {
                    this._sub = user.profile.sub;
                    this._sid = user.profile.sid;
                    Log.debug("SessionMonitor._start: session_state:", session_state, ", sub:", this._sub);
                }
                else {
                    this._sub = undefined;
                    this._sid = undefined;
                    Log.debug("SessionMonitor._start: session_state:", session_state, ", anonymous user");
                }

                if (!this._checkSessionIFrame) {
                    this._metadataService.getCheckSessionIframe().then(url => {
                        if (url) {
                            Log.debug("SessionMonitor._start: Initializing check session iframe");

                            let client_id = this._client_id;
                            let interval = this._checkSessionInterval;
                            let stopOnError = this._stopCheckSessionOnError;

                            this._checkSessionIFrame = new this._CheckSessionIFrameCtor(this._callback.bind(this), client_id, url, interval, stopOnError);
                            this._checkSessionIFrame.load().then(() => {
                                this._checkSessionIFrame.start(session_state);
                            });
                        }
                        else {
                            Log.warn("SessionMonitor._start: No check session iframe found in the metadata");
                        }
                    }).catch(err => {
                        // catch to suppress errors since we're in non-promise callback
                        Log.error("SessionMonitor._start: Error from getCheckSessionIframe:", err.message);
                    });
                }
                else {
                    this._checkSessionIFrame.start(session_state);
                }
            }
        }

        _stop() {
            this._sub = undefined;
            this._sid = undefined;

            if (this._checkSessionIFrame) {
                Log.debug("SessionMonitor._stop");
                this._checkSessionIFrame.stop();
            }

            if (this._settings.monitorAnonymousSession) {
                // using a timer to delay re-initialization to avoid race conditions during signout
                let timerHandle = this._timer.setInterval(()=>{
                    this._timer.clearInterval(timerHandle);

                    this._userManager.querySessionStatus().then(session => {
                        let tmpUser = {
                            session_state : session.session_state
                        };
                        if (session.sub && session.sid) {
                            tmpUser.profile = {
                                sub: session.sub,
                                sid: session.sid
                            };
                        }
                        this._start(tmpUser);
                    })
                    .catch(err => {
                        // catch to suppress errors since we're in a callback
                        Log.error("SessionMonitor: error from querySessionStatus:", err.message);
                    });

                }, 1000);
            }
        }

        _callback() {
            this._userManager.querySessionStatus().then(session => {
                var raiseEvent = true;

                if (session) {
                    if (session.sub === this._sub) {
                        raiseEvent = false;
                        this._checkSessionIFrame.start(session.session_state);

                        if (session.sid === this._sid) {
                            Log.debug("SessionMonitor._callback: Same sub still logged in at OP, restarting check session iframe; session_state:", session.session_state);
                        }
                        else {
                            Log.debug("SessionMonitor._callback: Same sub still logged in at OP, session state has changed, restarting check session iframe; session_state:", session.session_state);
                            this._userManager.events._raiseUserSessionChanged();
                        }
                    }
                    else {
                        Log.debug("SessionMonitor._callback: Different subject signed into OP:", session.sub);
                    }
                }
                else {
                    Log.debug("SessionMonitor._callback: Subject no longer signed into OP");
                }

                if (raiseEvent) {
                    if (this._sub) {
                        Log.debug("SessionMonitor._callback: SessionMonitor._callback; raising signed out event");
                        this._userManager.events._raiseUserSignedOut();
                    }
                    else {
                        Log.debug("SessionMonitor._callback: SessionMonitor._callback; raising signed in event");
                        this._userManager.events._raiseUserSignedIn();
                    }
                }
            }).catch(err => {
                if (this._sub) {
                    Log.debug("SessionMonitor._callback: Error calling queryCurrentSigninSession; raising signed out event", err.message);
                    this._userManager.events._raiseUserSignedOut();
                }
            });
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const AccessTokenTypeHint = "access_token";
    const RefreshTokenTypeHint = "refresh_token";

    class TokenRevocationClient {
        constructor(settings, XMLHttpRequestCtor = Global.XMLHttpRequest, MetadataServiceCtor = MetadataService) {
            if (!settings) {
                Log.error("TokenRevocationClient.ctor: No settings provided");
                throw new Error("No settings provided.");
            }

            this._settings = settings;
            this._XMLHttpRequestCtor = XMLHttpRequestCtor;
            this._metadataService = new MetadataServiceCtor(this._settings);
        }

        revoke(token, required, type = "access_token") {
            if (!token) {
                Log.error("TokenRevocationClient.revoke: No token provided");
                throw new Error("No token provided.");
            }

            if (type !== AccessTokenTypeHint && type != RefreshTokenTypeHint) {
                Log.error("TokenRevocationClient.revoke: Invalid token type");
                throw new Error("Invalid token type.");
            }

            return this._metadataService.getRevocationEndpoint().then(url => {
                if (!url) {
                    if (required) {
                        Log.error("TokenRevocationClient.revoke: Revocation not supported");
                        throw new Error("Revocation not supported");
                    }

                    // not required, so don't error and just return
                    return;
                }

                Log.debug("TokenRevocationClient.revoke: Revoking " + type);
                var client_id = this._settings.client_id;
                var client_secret = this._settings.client_secret;
                return this._revoke(url, client_id, client_secret, token, type);
            });
        }

        _revoke(url, client_id, client_secret, token, type) {

            return new Promise((resolve, reject) => {

                var xhr = new this._XMLHttpRequestCtor();
                xhr.open("POST", url);

                xhr.onload = () => {
                    Log.debug("TokenRevocationClient.revoke: HTTP response received, status", xhr.status);

                    if (xhr.status === 200) {
                        resolve();
                    }
                    else {
                        reject(Error(xhr.statusText + " (" + xhr.status + ")"));
                    }
                };
                xhr.onerror = () => { 
                    Log.debug("TokenRevocationClient.revoke: Network Error.");
                    reject("Network Error");
                };

                var body = "client_id=" + encodeURIComponent(client_id);
                if (client_secret) {
                    body += "&client_secret=" + encodeURIComponent(client_secret);
                }
                body += "&token_type_hint=" + encodeURIComponent(type);
                body += "&token=" + encodeURIComponent(token);

                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                xhr.send(body);
            });
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.


    class UserManager extends OidcClient {
        constructor(settings = {},
            SilentRenewServiceCtor = SilentRenewService,
            SessionMonitorCtor = SessionMonitor,
            TokenRevocationClientCtor = TokenRevocationClient,
            TokenClientCtor = TokenClient,
            joseUtil = JoseUtil
        ) {

            if (!(settings instanceof UserManagerSettings)) {
                settings = new UserManagerSettings(settings);
            }
            super(settings);

            this._events = new UserManagerEvents(settings);
            this._silentRenewService = new SilentRenewServiceCtor(this);

            // order is important for the following properties; these services depend upon the events.
            if (this.settings.automaticSilentRenew) {
                Log.debug("UserManager.ctor: automaticSilentRenew is configured, setting up silent renew");
                this.startSilentRenew();
            }

            if (this.settings.monitorSession) {
                Log.debug("UserManager.ctor: monitorSession is configured, setting up session monitor");
                this._sessionMonitor = new SessionMonitorCtor(this);
            }

            this._tokenRevocationClient = new TokenRevocationClientCtor(this._settings);
            this._tokenClient = new TokenClientCtor(this._settings);
            this._joseUtil = joseUtil;
        }

        get _redirectNavigator() {
            return this.settings.redirectNavigator;
        }
        get _popupNavigator() {
            return this.settings.popupNavigator;
        }
        get _iframeNavigator() {
            return this.settings.iframeNavigator;
        }
        get _userStore() {
            return this.settings.userStore;
        }

        get events() {
            return this._events;
        }

        getUser() {
            return this._loadUser().then(user => {
                if (user) {
                    Log.info("UserManager.getUser: user loaded");

                    this._events.load(user, false);

                    return user;
                }
                else {
                    Log.info("UserManager.getUser: user not found in storage");
                    return null;
                }
            });
        }

        removeUser() {
            return this.storeUser(null).then(() => {
                Log.info("UserManager.removeUser: user removed from storage");
                this._events.unload();
            });
        }

        signinRedirect(args = {}) {
            args = Object.assign({}, args);

            args.request_type = "si:r";
            let navParams = {
                useReplaceToNavigate : args.useReplaceToNavigate
            };
            return this._signinStart(args, this._redirectNavigator, navParams).then(()=>{
                Log.info("UserManager.signinRedirect: successful");
            });
        }
        signinRedirectCallback(url) {
            return this._signinEnd(url || this._redirectNavigator.url).then(user => {
                if (user.profile && user.profile.sub) {
                    Log.info("UserManager.signinRedirectCallback: successful, signed in sub: ", user.profile.sub);
                }
                else {
                    Log.info("UserManager.signinRedirectCallback: no sub");
                }

                return user;
            });
        }

        signinPopup(args = {}) {
            args = Object.assign({}, args);

            args.request_type = "si:p";
            let url = args.redirect_uri || this.settings.popup_redirect_uri || this.settings.redirect_uri;
            if (!url) {
                Log.error("UserManager.signinPopup: No popup_redirect_uri or redirect_uri configured");
                return Promise.reject(new Error("No popup_redirect_uri or redirect_uri configured"));
            }

            args.redirect_uri = url;
            args.display = "popup";

            return this._signin(args, this._popupNavigator, {
                startUrl: url,
                popupWindowFeatures: args.popupWindowFeatures || this.settings.popupWindowFeatures,
                popupWindowTarget: args.popupWindowTarget || this.settings.popupWindowTarget
            }).then(user => {
                if (user) {
                    if (user.profile && user.profile.sub) {
                        Log.info("UserManager.signinPopup: signinPopup successful, signed in sub: ", user.profile.sub);
                    }
                    else {
                        Log.info("UserManager.signinPopup: no sub");
                    }
                }

                return user;
            });
        }
        signinPopupCallback(url) {
            return this._signinCallback(url, this._popupNavigator).then(user => {
                if (user) {
                    if (user.profile && user.profile.sub) {
                        Log.info("UserManager.signinPopupCallback: successful, signed in sub: ", user.profile.sub);
                    }
                    else {
                        Log.info("UserManager.signinPopupCallback: no sub");
                    }
                }

                return user;
            }).catch(err=>{
                Log.error("UserManager.signinPopupCallback error: " + err && err.message);
            });
        }

        signinSilent(args = {}) {
            args = Object.assign({}, args);

            args.request_type = "si:s";
            // first determine if we have a refresh token, or need to use iframe
            return this._loadUser().then(user => {
                if (user && user.refresh_token) {
                    args.refresh_token = user.refresh_token;
                    return this._useRefreshToken(args);
                }
                else {
                    args.id_token_hint = args.id_token_hint || (this.settings.includeIdTokenInSilentRenew && user && user.id_token);
                    if (user && this._settings.validateSubOnSilentRenew) {
                        Log.debug("UserManager.signinSilent, subject prior to silent renew: ", user.profile.sub);
                        args.current_sub = user.profile.sub;
                    }
                    return this._signinSilentIframe(args);
                }
            });
        }

        _useRefreshToken(args = {}) {
            return this._tokenClient.exchangeRefreshToken(args).then(result => {
                if (!result) {
                    Log.error("UserManager._useRefreshToken: No response returned from token endpoint");
                    return Promise.reject("No response returned from token endpoint");
                }
                if (!result.access_token) {
                    Log.error("UserManager._useRefreshToken: No access token returned from token endpoint");
                    return Promise.reject("No access token returned from token endpoint");
                }

                return this._loadUser().then(user => {
                    if (user) {
                        let idTokenValidation = Promise.resolve();
                        if (result.id_token) {
                            idTokenValidation = this._validateIdTokenFromTokenRefreshToken(user.profile, result.id_token);
                        }

                        return idTokenValidation.then(() => {
                            Log.debug("UserManager._useRefreshToken: refresh token response success");
                            user.id_token = result.id_token;
                            user.access_token = result.access_token;
                            user.refresh_token = result.refresh_token || user.refresh_token;
                            user.expires_in = result.expires_in;

                            return this.storeUser(user).then(()=>{
                                this._events.load(user);
                                return user;
                            });
                        });
                    }
                    else {
                        return null;
                    }
                });
            });
        }

        _validateIdTokenFromTokenRefreshToken(profile, id_token) {
            return this._metadataService.getIssuer().then(issuer => {
                return this._joseUtil.validateJwtAttributes(id_token, issuer, this._settings.client_id, this._settings.clockSkew).then(payload => {
                    if (!payload) {
                        Log.error("UserManager._validateIdTokenFromTokenRefreshToken: Failed to validate id_token");
                        return Promise.reject(new Error("Failed to validate id_token"));
                    }
                    if (payload.sub !== profile.sub) {
                        Log.error("UserManager._validateIdTokenFromTokenRefreshToken: sub in id_token does not match current sub");
                        return Promise.reject(new Error("sub in id_token does not match current sub"));
                    }
                    if (payload.auth_time && payload.auth_time !== profile.auth_time) {
                        Log.error("UserManager._validateIdTokenFromTokenRefreshToken: auth_time in id_token does not match original auth_time");
                        return Promise.reject(new Error("auth_time in id_token does not match original auth_time"));
                    }
                    if (payload.azp && payload.azp !== profile.azp) {
                        Log.error("UserManager._validateIdTokenFromTokenRefreshToken: azp in id_token does not match original azp");
                        return Promise.reject(new Error("azp in id_token does not match original azp"));
                    }
                    if (!payload.azp && profile.azp) {
                        Log.error("UserManager._validateIdTokenFromTokenRefreshToken: azp not in id_token, but present in original id_token");
                        return Promise.reject(new Error("azp not in id_token, but present in original id_token"));
                    }
                });
            });
        }
        
        _signinSilentIframe(args = {}) {
            let url = args.redirect_uri || this.settings.silent_redirect_uri || this.settings.redirect_uri;
            if (!url) {
                Log.error("UserManager.signinSilent: No silent_redirect_uri configured");
                return Promise.reject(new Error("No silent_redirect_uri configured"));
            }

            args.redirect_uri = url;
            args.prompt = args.prompt || "none";

            return this._signin(args, this._iframeNavigator, {
                startUrl: url,
                silentRequestTimeout: args.silentRequestTimeout || this.settings.silentRequestTimeout
            }).then(user => {
                if (user) {
                    if (user.profile && user.profile.sub) {
                        Log.info("UserManager.signinSilent: successful, signed in sub: ", user.profile.sub);
                    }
                    else {
                        Log.info("UserManager.signinSilent: no sub");
                    }
                }

                return user;
            });
        }

        signinSilentCallback(url) {
            return this._signinCallback(url, this._iframeNavigator).then(user => {
                if (user) {
                    if (user.profile && user.profile.sub) {
                        Log.info("UserManager.signinSilentCallback: successful, signed in sub: ", user.profile.sub);
                    }
                    else {
                        Log.info("UserManager.signinSilentCallback: no sub");
                    }
                }

                return user;
            });
        }

        signinCallback(url) {
            return this.readSigninResponseState(url).then(({state, response}) => {
                if (state.request_type === "si:r") {
                    return this.signinRedirectCallback(url);
                }
                if (state.request_type === "si:p") {
                    return this.signinPopupCallback(url);
                }
                if (state.request_type === "si:s") {
                    return this.signinSilentCallback(url);
                }
                return Promise.reject(new Error("invalid response_type in state"));
            });
        }

        signoutCallback(url, keepOpen) {
            return this.readSignoutResponseState(url).then(({state, response}) => {
                if (state) {
                    if (state.request_type === "so:r") {
                        return this.signoutRedirectCallback(url);
                    }
                    if (state.request_type === "so:p") {
                        return this.signoutPopupCallback(url, keepOpen);
                    }
                    return Promise.reject(new Error("invalid response_type in state"));
                }
                return response;
            });
        }

        querySessionStatus(args = {}) {
            args = Object.assign({}, args);

            args.request_type = "si:s"; // this acts like a signin silent
            let url = args.redirect_uri || this.settings.silent_redirect_uri || this.settings.redirect_uri;
            if (!url) {
                Log.error("UserManager.querySessionStatus: No silent_redirect_uri configured");
                return Promise.reject(new Error("No silent_redirect_uri configured"));
            }

            args.redirect_uri = url;
            args.prompt = "none";
            args.response_type = args.response_type || this.settings.query_status_response_type;
            args.scope = args.scope || "openid";
            args.skipUserInfo = true;

            return this._signinStart(args, this._iframeNavigator, {
                startUrl: url,
                silentRequestTimeout: args.silentRequestTimeout || this.settings.silentRequestTimeout
            }).then(navResponse => {
                return this.processSigninResponse(navResponse.url).then(signinResponse => {
                    Log.debug("UserManager.querySessionStatus: got signin response");

                    if (signinResponse.session_state && signinResponse.profile.sub) {
                        Log.info("UserManager.querySessionStatus: querySessionStatus success for sub: ",  signinResponse.profile.sub);
                        return {
                            session_state: signinResponse.session_state,
                            sub: signinResponse.profile.sub,
                            sid: signinResponse.profile.sid
                        };
                    }
                    else {
                        Log.info("querySessionStatus successful, user not authenticated");
                    }
                })
                .catch(err => {
                    if (err.session_state && this.settings.monitorAnonymousSession) {
                        if (err.message == "login_required" || 
                            err.message == "consent_required" || 
                            err.message == "interaction_required" || 
                            err.message == "account_selection_required"
                        ) {
                            Log.info("UserManager.querySessionStatus: querySessionStatus success for anonymous user");
                            return {
                                session_state: err.session_state
                            };
                        }
                    }

                    throw err;
                });
            });
        }

        _signin(args, navigator, navigatorParams = {}) {
            return this._signinStart(args, navigator, navigatorParams).then(navResponse => {
                return this._signinEnd(navResponse.url, args);
            });
        }
        _signinStart(args, navigator, navigatorParams = {}) {

            return navigator.prepare(navigatorParams).then(handle => {
                Log.debug("UserManager._signinStart: got navigator window handle");

                return this.createSigninRequest(args).then(signinRequest => {
                    Log.debug("UserManager._signinStart: got signin request");

                    navigatorParams.url = signinRequest.url;
                    navigatorParams.id = signinRequest.state.id;

                    return handle.navigate(navigatorParams);
                }).catch(err => {
                    if (handle.close) {
                        Log.debug("UserManager._signinStart: Error after preparing navigator, closing navigator window");
                        handle.close();
                    }
                    throw err;
                });
            });
        }
        _signinEnd(url, args = {}) {
            return this.processSigninResponse(url).then(signinResponse => {
                Log.debug("UserManager._signinEnd: got signin response");

                let user = new User(signinResponse);

                if (args.current_sub) {
                    if (args.current_sub !== user.profile.sub) {
                        Log.debug("UserManager._signinEnd: current user does not match user returned from signin. sub from signin: ", user.profile.sub);
                        return Promise.reject(new Error("login_required"));
                    }
                    else {
                        Log.debug("UserManager._signinEnd: current user matches user returned from signin");
                    }
                }

                return this.storeUser(user).then(() => {
                    Log.debug("UserManager._signinEnd: user stored");

                    this._events.load(user);

                    return user;
                });
            });
        }
        _signinCallback(url, navigator) {
            Log.debug("UserManager._signinCallback");
            return navigator.callback(url);
        }

        signoutRedirect(args = {}) {
            args = Object.assign({}, args);

            args.request_type = "so:r";
            let postLogoutRedirectUri = args.post_logout_redirect_uri || this.settings.post_logout_redirect_uri;
            if (postLogoutRedirectUri){
                args.post_logout_redirect_uri = postLogoutRedirectUri;
            }
            let navParams = {
                useReplaceToNavigate : args.useReplaceToNavigate
            };
            return this._signoutStart(args, this._redirectNavigator, navParams).then(()=>{
                Log.info("UserManager.signoutRedirect: successful");
            });
        }
        signoutRedirectCallback(url) {
            return this._signoutEnd(url || this._redirectNavigator.url).then(response=>{
                Log.info("UserManager.signoutRedirectCallback: successful");
                return response;
            });
        }

        signoutPopup(args = {}) {
            args = Object.assign({}, args);

            args.request_type = "so:p";
            let url = args.post_logout_redirect_uri || this.settings.popup_post_logout_redirect_uri || this.settings.post_logout_redirect_uri;
            args.post_logout_redirect_uri = url;
            args.display = "popup";
            if (args.post_logout_redirect_uri){
                // we're putting a dummy entry in here because we
                // need a unique id from the state for notification
                // to the parent window, which is necessary if we
                // plan to return back to the client after signout
                // and so we can close the popup after signout
                args.state = args.state || {};
            }

            return this._signout(args, this._popupNavigator, {
                startUrl: url,
                popupWindowFeatures: args.popupWindowFeatures || this.settings.popupWindowFeatures,
                popupWindowTarget: args.popupWindowTarget || this.settings.popupWindowTarget
            }).then(() => {
                Log.info("UserManager.signoutPopup: successful");
            });
        }
        signoutPopupCallback(url, keepOpen) {
            if (typeof(keepOpen) === 'undefined' && typeof(url) === 'boolean') {
                keepOpen = url;
                url = null;
            }

            let delimiter = '?';
            return this._popupNavigator.callback(url, keepOpen, delimiter).then(() => {
                Log.info("UserManager.signoutPopupCallback: successful");
            });
        }

        _signout(args, navigator, navigatorParams = {}) {
            return this._signoutStart(args, navigator, navigatorParams).then(navResponse => {
                return this._signoutEnd(navResponse.url);
            });
        }
        _signoutStart(args = {}, navigator, navigatorParams = {}) {
            return navigator.prepare(navigatorParams).then(handle => {
                Log.debug("UserManager._signoutStart: got navigator window handle");

                return this._loadUser().then(user => {
                    Log.debug("UserManager._signoutStart: loaded current user from storage");

                    var revokePromise = this._settings.revokeAccessTokenOnSignout ? this._revokeInternal(user) : Promise.resolve();
                    return revokePromise.then(() => {

                        var id_token = args.id_token_hint || user && user.id_token;
                        if (id_token) {
                            Log.debug("UserManager._signoutStart: Setting id_token into signout request");
                            args.id_token_hint = id_token;
                        }

                        return this.removeUser().then(() => {
                            Log.debug("UserManager._signoutStart: user removed, creating signout request");

                            return this.createSignoutRequest(args).then(signoutRequest => {
                                Log.debug("UserManager._signoutStart: got signout request");

                                navigatorParams.url = signoutRequest.url;
                                if (signoutRequest.state) {
                                    navigatorParams.id = signoutRequest.state.id;
                                }
                                return handle.navigate(navigatorParams);
                            });
                        });
                    });
                }).catch(err => {
                    if (handle.close) {
                        Log.debug("UserManager._signoutStart: Error after preparing navigator, closing navigator window");
                        handle.close();
                    }
                    throw err;
                });
            });
        }
        _signoutEnd(url) {
            return this.processSignoutResponse(url).then(signoutResponse => {
                Log.debug("UserManager._signoutEnd: got signout response");

                return signoutResponse;
            });
        }

        revokeAccessToken() {
            return this._loadUser().then(user => {
                return this._revokeInternal(user, true).then(success => {
                    if (success) {
                        Log.debug("UserManager.revokeAccessToken: removing token properties from user and re-storing");

                        user.access_token = null;
                        user.refresh_token = null;
                        user.expires_at = null;
                        user.token_type = null;

                        return this.storeUser(user).then(() => {
                            Log.debug("UserManager.revokeAccessToken: user stored");
                            this._events.load(user);
                        });
                    }
                });
            }).then(()=>{
                Log.info("UserManager.revokeAccessToken: access token revoked successfully");
            });
        }

        _revokeInternal(user, required) {
            if (user) {
                var access_token = user.access_token;
                var refresh_token = user.refresh_token;

                return this._revokeAccessTokenInternal(access_token, required)
                    .then(atSuccess => {
                        return this._revokeRefreshTokenInternal(refresh_token, required)
                            .then(rtSuccess => {
                                if (!atSuccess && !rtSuccess) {
                                    Log.debug("UserManager.revokeAccessToken: no need to revoke due to no token(s), or JWT format");
                                }
                                
                                return atSuccess || rtSuccess;
                            });
                    });
            }

            return Promise.resolve(false);
        }

        _revokeAccessTokenInternal(access_token, required) {
            // check for JWT vs. reference token
            if (!access_token || access_token.indexOf('.') >= 0) {
                return Promise.resolve(false);
            }

            return this._tokenRevocationClient.revoke(access_token, required).then(() => true);
        }

        _revokeRefreshTokenInternal(refresh_token, required) {
            if (!refresh_token) {
                return Promise.resolve(false);
            }

            return this._tokenRevocationClient.revoke(refresh_token, required, "refresh_token").then(() => true);
        }

        startSilentRenew() {
            this._silentRenewService.start();
        }

        stopSilentRenew() {
            this._silentRenewService.stop();
        }

        get _userStoreKey() {
            return `user:${this.settings.authority}:${this.settings.client_id}`;
        }

        _loadUser() {
            return this._userStore.get(this._userStoreKey).then(storageString => {
                if (storageString) {
                    Log.debug("UserManager._loadUser: user storageString loaded");
                    return User.fromStorageString(storageString);
                }

                Log.debug("UserManager._loadUser: no user storageString");
                return null;
            });
        }

        storeUser(user) {
            if (user) {
                Log.debug("UserManager.storeUser: storing user");

                var storageString = user.toStorageString();
                return this._userStore.set(this._userStoreKey, storageString);
            }
            else {
                Log.debug("storeUser.storeUser: removing user");
                return this._userStore.remove(this._userStoreKey);
            }
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    const DefaultPopupFeatures$1 = 'location=no,toolbar=no,zoom=no';
    const DefaultPopupTarget$1 = "_blank";

    class CordovaPopupWindow {

        constructor(params) {
            this._promise = new Promise((resolve, reject) => {
                this._resolve = resolve;
                this._reject = reject;
            });

            this.features = params.popupWindowFeatures || DefaultPopupFeatures$1;
            this.target = params.popupWindowTarget || DefaultPopupTarget$1;
            
            this.redirect_uri = params.startUrl;
            Log.debug("CordovaPopupWindow.ctor: redirect_uri: " + this.redirect_uri);
        }

        _isInAppBrowserInstalled(cordovaMetadata) {
            return ["cordova-plugin-inappbrowser", "cordova-plugin-inappbrowser.inappbrowser", "org.apache.cordova.inappbrowser"].some(function (name) {
                return cordovaMetadata.hasOwnProperty(name)
            })
        }
        
        navigate(params) {
            if (!params || !params.url) {
                this._error("No url provided");
            } else {
                if (!window.cordova) {
                    return this._error("cordova is undefined")
                }
                
                var cordovaMetadata = window.cordova.require("cordova/plugin_list").metadata;
                if (this._isInAppBrowserInstalled(cordovaMetadata) === false) {
                    return this._error("InAppBrowser plugin not found")
                }
                this._popup = cordova.InAppBrowser.open(params.url, this.target, this.features);
                if (this._popup) {
                    Log.debug("CordovaPopupWindow.navigate: popup successfully created");
                    
                    this._exitCallbackEvent = this._exitCallback.bind(this); 
                    this._loadStartCallbackEvent = this._loadStartCallback.bind(this);
                    
                    this._popup.addEventListener("exit", this._exitCallbackEvent, false);
                    this._popup.addEventListener("loadstart", this._loadStartCallbackEvent, false);
                } else {
                    this._error("Error opening popup window");
                }
            }
            return this.promise;
        }

        get promise() {
            return this._promise;
        }

        _loadStartCallback(event) {
            if (event.url.indexOf(this.redirect_uri) === 0) {
                this._success({ url: event.url });
            }    
        }
        _exitCallback(message) {
            this._error(message);    
        }
        
        _success(data) {
            this._cleanup();

            Log.debug("CordovaPopupWindow: Successful response from cordova popup window");
            this._resolve(data);
        }
        _error(message) {
            this._cleanup();

            Log.error(message);
            this._reject(new Error(message));
        }

        close() {
            this._cleanup();
        }

        _cleanup() {
            if (this._popup){
                Log.debug("CordovaPopupWindow: cleaning up popup");
                this._popup.removeEventListener("exit", this._exitCallbackEvent, false);
                this._popup.removeEventListener("loadstart", this._loadStartCallbackEvent, false);
                this._popup.close();
            }
            this._popup = null;
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class CordovaPopupNavigator {

        prepare(params) {
            let popup = new CordovaPopupWindow(params);
            return Promise.resolve(popup);
        }
    }

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    class CordovaIFrameNavigator {

        prepare(params) {
            params.popupWindowFeatures = 'hidden=yes';
            let popup = new CordovaPopupWindow(params);
            return Promise.resolve(popup);
        }
    }

    const Version = "1.10.1";

    // Copyright (c) Brock Allen & Dominick Baier. All rights reserved.

    var oidcClient = {
        Version,
        Log,
        OidcClient,
        OidcClientSettings,
        WebStorageStateStore,
        InMemoryWebStorage,
        UserManager,
        AccessTokenEvents,
        MetadataService,
        CordovaPopupNavigator,
        CordovaIFrameNavigator,
        CheckSessionIFrame,
        TokenRevocationClient,
        SessionMonitor,
        Global,
        User
    };

    /* src\components\OidcContext.svelte generated by Svelte v3.23.0 */

    const { Error: Error_1 } = globals;

    function create_fragment$1(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function handleOnDestroy() {
    	
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const { UserManager } = oidcClient;
    	let { issuer } = $$props;
    	let { client_id } = $$props;
    	let { redirect_uri } = $$props;
    	let { post_logout_redirect_uri } = $$props;
    	let { metadata = {} } = $$props;
    	setContext(OIDC_CONTEXT_REDIRECT_URI, redirect_uri);
    	setContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI, post_logout_redirect_uri);

    	// getContext doesn't seem to return a value in OnMount, so we'll pass the oidcPromise around by reference.
    	const settings = {
    		authority: issuer,
    		client_id,
    		response_type: "id_token token",
    		redirect_uri,
    		post_logout_redirect_uri,
    		response_type: "code",
    		scope: "openid profile email",
    		automaticSilentRenew: true,
    		metadata
    	};

    	const userManager = new UserManager(settings);

    	userManager.events.addUserLoaded(function (user) {
    		isAuthenticated.set(true);
    		accessToken.set(user.access_token);
    		idToken.set(user.id_token);
    		userInfo.set(user.profile);
    	});

    	userManager.events.addUserUnloaded(function () {
    		isAuthenticated.set(false);
    		idToken.set("");
    		accessToken.set("");
    		userInfo.set({});
    	});

    	userManager.events.addSilentRenewError(function (e) {
    		authError.set(`silentRenewError: ${e.message}`);
    	});

    	let oidcPromise = Promise.resolve(userManager);
    	setContext(OIDC_CONTEXT_CLIENT_PROMISE, oidcPromise);

    	async function handleOnMount() {
    		// on run onMount after oidc
    		const oidc = await oidcPromise;

    		// Not all browsers support this, please program defensively!
    		const params = new URLSearchParams(window.location.search);

    		// Check if something went wrong during login redirect
    		// and extract the error message
    		if (params.has("error")) {
    			authError.set(new Error(params.get("error_description")));
    		}

    		// if code then login success
    		if (params.has("code")) {
    			// handle the callback
    			const response = await oidc.signinCallback();

    			let state = response && response.state || {};

    			// Can be smart here and redirect to original path instead of root
    			const url = state && state.targetUrl
    			? state.targetUrl
    			: window.location.pathname;

    			state = { ...state, isRedirectCallback: true };

    			// redirect to the last page we were on when login was configured if it was passed.
    			history.replaceState(state, "", url);

    			// location.href = url;
    			// clear errors on login.
    			authError.set(null);
    		}

    		isLoading.set(false);
    	}

    	onMount(handleOnMount);
    	onDestroy(handleOnDestroy);
    	const writable_props = ["issuer", "client_id", "redirect_uri", "post_logout_redirect_uri", "metadata"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<OidcContext> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("OidcContext", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("issuer" in $$props) $$invalidate(0, issuer = $$props.issuer);
    		if ("client_id" in $$props) $$invalidate(1, client_id = $$props.client_id);
    		if ("redirect_uri" in $$props) $$invalidate(2, redirect_uri = $$props.redirect_uri);
    		if ("post_logout_redirect_uri" in $$props) $$invalidate(3, post_logout_redirect_uri = $$props.post_logout_redirect_uri);
    		if ("metadata" in $$props) $$invalidate(4, metadata = $$props.metadata);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		oidcClient,
    		UserManager,
    		onMount,
    		onDestroy,
    		setContext,
    		getContext,
    		OIDC_CONTEXT_REDIRECT_URI,
    		OIDC_CONTEXT_CLIENT_PROMISE,
    		OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI,
    		idToken,
    		accessToken,
    		isAuthenticated,
    		isLoading,
    		authError,
    		userInfo,
    		issuer,
    		client_id,
    		redirect_uri,
    		post_logout_redirect_uri,
    		metadata,
    		settings,
    		userManager,
    		oidcPromise,
    		handleOnMount,
    		handleOnDestroy
    	});

    	$$self.$inject_state = $$props => {
    		if ("issuer" in $$props) $$invalidate(0, issuer = $$props.issuer);
    		if ("client_id" in $$props) $$invalidate(1, client_id = $$props.client_id);
    		if ("redirect_uri" in $$props) $$invalidate(2, redirect_uri = $$props.redirect_uri);
    		if ("post_logout_redirect_uri" in $$props) $$invalidate(3, post_logout_redirect_uri = $$props.post_logout_redirect_uri);
    		if ("metadata" in $$props) $$invalidate(4, metadata = $$props.metadata);
    		if ("oidcPromise" in $$props) oidcPromise = $$props.oidcPromise;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		issuer,
    		client_id,
    		redirect_uri,
    		post_logout_redirect_uri,
    		metadata,
    		UserManager,
    		settings,
    		userManager,
    		oidcPromise,
    		handleOnMount,
    		$$scope,
    		$$slots
    	];
    }

    class OidcContext extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			issuer: 0,
    			client_id: 1,
    			redirect_uri: 2,
    			post_logout_redirect_uri: 3,
    			metadata: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OidcContext",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*issuer*/ ctx[0] === undefined && !("issuer" in props)) {
    			console.warn("<OidcContext> was created without expected prop 'issuer'");
    		}

    		if (/*client_id*/ ctx[1] === undefined && !("client_id" in props)) {
    			console.warn("<OidcContext> was created without expected prop 'client_id'");
    		}

    		if (/*redirect_uri*/ ctx[2] === undefined && !("redirect_uri" in props)) {
    			console.warn("<OidcContext> was created without expected prop 'redirect_uri'");
    		}

    		if (/*post_logout_redirect_uri*/ ctx[3] === undefined && !("post_logout_redirect_uri" in props)) {
    			console.warn("<OidcContext> was created without expected prop 'post_logout_redirect_uri'");
    		}
    	}

    	get issuer() {
    		throw new Error_1("<OidcContext>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set issuer(value) {
    		throw new Error_1("<OidcContext>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get client_id() {
    		throw new Error_1("<OidcContext>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set client_id(value) {
    		throw new Error_1("<OidcContext>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get redirect_uri() {
    		throw new Error_1("<OidcContext>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set redirect_uri(value) {
    		throw new Error_1("<OidcContext>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get post_logout_redirect_uri() {
    		throw new Error_1("<OidcContext>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set post_logout_redirect_uri(value) {
    		throw new Error_1("<OidcContext>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get metadata() {
    		throw new Error_1("<OidcContext>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set metadata(value) {
    		throw new Error_1("<OidcContext>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.23.0 */

    const file$1 = "src\\App.svelte";

    // (24:0) <OidcContext   issuer="https://login.microsoftonline.com/757cbf3a-0ef6-4196-8163-947401a97de4/v2.0/"   client_id="82f014e9-8eeb-4003-9ce6-e408682ef523"   redirect_uri="http://localhost:5000/callback"   post_logout_redirect_uri="http://localhost:5000/" >
    function create_default_slot(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let th1;
    	let t8;
    	let tbody;
    	let tr1;
    	let td0;
    	let td1;
    	let t10;
    	let t11;
    	let tr2;
    	let td2;
    	let td3;
    	let t13;
    	let t14;
    	let tr3;
    	let td4;
    	let td5;
    	let t16;
    	let t17;
    	let tr4;
    	let td6;
    	let td7;
    	let t19;
    	let t20;
    	let tr5;
    	let td8;
    	let td9;
    	let t22;
    	let tr6;
    	let td10;
    	let td11;
    	let t24;
    	let current;
    	let mounted;
    	let dispose;

    	const highlight = new Highlight({
    			props: {
    				language: json$1,
    				code: JSON.stringify(/*$userInfo*/ ctx[4], null, 2) || ""
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Login";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Logout";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "refreshToken";
    			t5 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "store";
    			th1 = element("th");
    			th1.textContent = "value";
    			t8 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "isLoading";
    			td1 = element("td");
    			t10 = text(/*$isLoading*/ ctx[0]);
    			t11 = space();
    			tr2 = element("tr");
    			td2 = element("td");
    			td2.textContent = "isAuthenticated";
    			td3 = element("td");
    			t13 = text(/*$isAuthenticated*/ ctx[1]);
    			t14 = space();
    			tr3 = element("tr");
    			td4 = element("td");
    			td4.textContent = "accessToken";
    			td5 = element("td");
    			t16 = text(/*$accessToken*/ ctx[2]);
    			t17 = space();
    			tr4 = element("tr");
    			td6 = element("td");
    			td6.textContent = "idToken";
    			td7 = element("td");
    			t19 = text(/*$idToken*/ ctx[3]);
    			t20 = space();
    			tr5 = element("tr");
    			td8 = element("td");
    			td8.textContent = "userInfo";
    			td9 = element("td");
    			create_component(highlight.$$.fragment);
    			t22 = space();
    			tr6 = element("tr");
    			td10 = element("td");
    			td10.textContent = "authError";
    			td11 = element("td");
    			t24 = text(/*$authError*/ ctx[5]);
    			attr_dev(button0, "class", "btn");
    			add_location(button0, file$1, 30, 2, 713);
    			attr_dev(button1, "class", "btn");
    			add_location(button1, file$1, 31, 2, 793);
    			attr_dev(button2, "class", "btn");
    			add_location(button2, file$1, 32, 2, 875);
    			set_style(th0, "width", "20%");
    			add_location(th0, file$1, 35, 10, 999);
    			set_style(th1, "width", "80%");
    			add_location(th1, file$1, 35, 44, 1033);
    			add_location(tr0, file$1, 35, 6, 995);
    			add_location(thead, file$1, 34, 4, 981);
    			add_location(td0, file$1, 38, 10, 1108);
    			add_location(td1, file$1, 38, 28, 1126);
    			add_location(tr1, file$1, 38, 6, 1104);
    			add_location(td2, file$1, 39, 10, 1163);
    			add_location(td3, file$1, 39, 34, 1187);
    			add_location(tr2, file$1, 39, 6, 1159);
    			add_location(td4, file$1, 40, 10, 1230);
    			set_style(td5, "word-break", "break-all");
    			add_location(td5, file$1, 40, 30, 1250);
    			add_location(tr3, file$1, 40, 6, 1226);
    			add_location(td6, file$1, 41, 10, 1320);
    			set_style(td7, "word-break", "break-all");
    			add_location(td7, file$1, 41, 26, 1336);
    			add_location(tr4, file$1, 41, 6, 1316);
    			add_location(td8, file$1, 42, 10, 1402);
    			add_location(td9, file$1, 42, 27, 1419);
    			add_location(tr5, file$1, 42, 6, 1398);
    			add_location(td10, file$1, 43, 10, 1521);
    			add_location(td11, file$1, 43, 28, 1539);
    			add_location(tr6, file$1, 43, 6, 1517);
    			add_location(tbody, file$1, 37, 4, 1090);
    			add_location(table, file$1, 33, 2, 969);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, th1);
    			append_dev(table, t8);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, td1);
    			append_dev(td1, t10);
    			append_dev(tbody, t11);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td2);
    			append_dev(tr2, td3);
    			append_dev(td3, t13);
    			append_dev(tbody, t14);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td4);
    			append_dev(tr3, td5);
    			append_dev(td5, t16);
    			append_dev(tbody, t17);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td6);
    			append_dev(tr4, td7);
    			append_dev(td7, t19);
    			append_dev(tbody, t20);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td8);
    			append_dev(tr5, td9);
    			mount_component(highlight, td9, null);
    			append_dev(tbody, t22);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td10);
    			append_dev(tr6, td11);
    			append_dev(td11, t24);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", prevent_default(/*click_handler*/ ctx[6]), false, true, false),
    					listen_dev(button1, "click", prevent_default(/*click_handler_1*/ ctx[7]), false, true, false),
    					listen_dev(button2, "click", prevent_default(/*click_handler_2*/ ctx[8]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*$isLoading*/ 1) set_data_dev(t10, /*$isLoading*/ ctx[0]);
    			if (!current || dirty & /*$isAuthenticated*/ 2) set_data_dev(t13, /*$isAuthenticated*/ ctx[1]);
    			if (!current || dirty & /*$accessToken*/ 4) set_data_dev(t16, /*$accessToken*/ ctx[2]);
    			if (!current || dirty & /*$idToken*/ 8) set_data_dev(t19, /*$idToken*/ ctx[3]);
    			const highlight_changes = {};
    			if (dirty & /*$userInfo*/ 16) highlight_changes.code = JSON.stringify(/*$userInfo*/ ctx[4], null, 2) || "";
    			highlight.$set(highlight_changes);
    			if (!current || dirty & /*$authError*/ 32) set_data_dev(t24, /*$authError*/ ctx[5]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(highlight.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(highlight.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(table);
    			destroy_component(highlight);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(24:0) <OidcContext   issuer=\\\"https://login.microsoftonline.com/757cbf3a-0ef6-4196-8163-947401a97de4/v2.0/\\\"   client_id=\\\"82f014e9-8eeb-4003-9ce6-e408682ef523\\\"   redirect_uri=\\\"http://localhost:5000/callback\\\"   post_logout_redirect_uri=\\\"http://localhost:5000/\\\" >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let html_tag;
    	let html_anchor;
    	let t;
    	let div;
    	let current;

    	const oidccontext = new OidcContext({
    			props: {
    				issuer: "https://login.microsoftonline.com/757cbf3a-0ef6-4196-8163-947401a97de4/v2.0/",
    				client_id: "82f014e9-8eeb-4003-9ce6-e408682ef523",
    				redirect_uri: "http://localhost:5000/callback",
    				post_logout_redirect_uri: "http://localhost:5000/",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			html_anchor = empty();
    			t = space();
    			div = element("div");
    			create_component(oidccontext.$$.fragment);
    			html_tag = new HtmlTag(null);
    			attr_dev(div, "class", "container");
    			add_location(div, file$1, 22, 0, 432);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(arduinoLight, document.head);
    			append_dev(document.head, html_anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(oidccontext, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const oidccontext_changes = {};

    			if (dirty & /*$$scope, $authError, $userInfo, $idToken, $accessToken, $isAuthenticated, $isLoading*/ 575) {
    				oidccontext_changes.$$scope = { dirty, ctx };
    			}

    			oidccontext.$set(oidccontext_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(oidccontext.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(oidccontext.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			destroy_component(oidccontext);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $isLoading;
    	let $isAuthenticated;
    	let $accessToken;
    	let $idToken;
    	let $userInfo;
    	let $authError;
    	validate_store(isLoading, "isLoading");
    	component_subscribe($$self, isLoading, $$value => $$invalidate(0, $isLoading = $$value));
    	validate_store(isAuthenticated, "isAuthenticated");
    	component_subscribe($$self, isAuthenticated, $$value => $$invalidate(1, $isAuthenticated = $$value));
    	validate_store(accessToken, "accessToken");
    	component_subscribe($$self, accessToken, $$value => $$invalidate(2, $accessToken = $$value));
    	validate_store(idToken, "idToken");
    	component_subscribe($$self, idToken, $$value => $$invalidate(3, $idToken = $$value));
    	validate_store(userInfo, "userInfo");
    	component_subscribe($$self, userInfo, $$value => $$invalidate(4, $userInfo = $$value));
    	validate_store(authError, "authError");
    	component_subscribe($$self, authError, $$value => $$invalidate(5, $authError = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => login();
    	const click_handler_1 = () => logout();
    	const click_handler_2 = () => refreshToken();

    	$$self.$capture_state = () => ({
    		Highlight,
    		json: json$1,
    		highlightTheme: arduinoLight,
    		OidcContext,
    		authError,
    		idToken,
    		accessToken,
    		isAuthenticated,
    		isLoading,
    		login,
    		logout,
    		refreshToken,
    		userInfo,
    		$isLoading,
    		$isAuthenticated,
    		$accessToken,
    		$idToken,
    		$userInfo,
    		$authError
    	});

    	return [
    		$isLoading,
    		$isAuthenticated,
    		$accessToken,
    		$idToken,
    		$userInfo,
    		$authError,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {},
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
