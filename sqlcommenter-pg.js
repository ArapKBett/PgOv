// sqlcommenter-pg.js

const path = require('path');

// Utility: get caller file path from stack introspection
function getCallerFile() {
  const origPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  const err = new Error();
  Error.captureStackTrace(err, getCallerFile);
  const stack = err.stack;

  Error.prepareStackTrace = origPrepareStackTrace;

  for (const frame of stack) {
    const filename = frame.getFileName();
    if (
      filename &&
      !filename.includes('node_modules') &&
      !filename.endsWith('sqlcommenter-pg.js')
    ) {
      return filename;
    }
  }
  return 'unknown';
}

// Compose SQL comment string from tags object
function sqlCommentFromTags(tags) {
  // tags keys and values must be URI encoded if needed
  const parts = [];
  for (const [k, v] of Object.entries(tags)) {
    // encodeURIComponent to safely encode values
    parts.push(`${k}=${encodeURIComponent(v)}`);
  }
  return `/*${parts.join(' ')}*/`;
}

// Inject SQL comment into query text before final semicolon if any
function injectComment(sql, comment) {
  const trimmed = sql.trim();
  if (trimmed.endsWith(';')) {
    return trimmed.slice(0, -1) + ' ' + comment + ';';
  }
  return trimmed + ' ' + comment;
}

/**
 * Patch pg Pool.prototype.query and Client.prototype.query similarly
 * @param {object} pg - The `pg` module or object containing Pool and Client classes
 */
function patchPG(pg) {
  if (!pg || !pg.Pool || !pg.Client) {
    throw new Error('Invalid pg module passed – must have Pool and Client classes');
  }

  // List of classes to patch - Pool and Client
  [pg.Pool.prototype, pg.Client.prototype].forEach(proto => {
    const origQuery = proto.query;

    proto.query = function patchedQuery(config, values, callback) {
      // Support calling conventions:
      // query(text, values, callback)
      // query(text, callback)
      // query(config, callback)
      if (typeof values === 'function') {
        callback = values;
        values = undefined;
      }

      // Determine SQL text based on config type
      let sqlText;
      let queryValues;

      if (typeof config === 'string') {
        sqlText = config;
        queryValues = values;
      } else if (config && typeof config.text === 'string') {
        // QueryConfig object
        sqlText = config.text;
        queryValues = values || config.values;
      } else {
        // fallback - call original directly
        return origQuery.call(this, config, values, callback);
      }

      // Generate standard tags (mimic sqlcommenter – replace with real ones or your integration)
      // For demo: dummy traceparent + tracestate
      const tags = {
        traceparent: '00-11111111111111111111111111111111-1111111111111111-01',
        tracestate: 'congo=t61rcWkgMzE',
        framework: 'nodejs-pg',
      };

      // Add your custom file tag from caller introspection
      try {
        const callerFile = getCallerFile();
        tags.file = path.relative(process.cwd(), callerFile);
      } catch (e) {
        // ignore errors in caller detection
      }

      // Existing SQLCommenter might have tags already; merge / append your file tag without overwriting
      // For simplicity, add tags in a single comment.
      const comment = sqlCommentFromTags(tags);

      // Inject comment into the SQL text
      const newSQL = injectComment(sqlText, comment);

      // If config object, clone and update text for safety
      let newConfig;
      if (typeof config === 'string') {
        newConfig = newSQL;
      } else {
        // clone config to avoid mutation
        newConfig = Object.assign({}, config, { text: newSQL });
      }

      // Call original .query with new SQL
      if (callback) {
        return origQuery.call(this, newConfig, queryValues, callback);
      }
      return origQuery.call(this, newConfig, queryValues);
    };
  });
}

module.exports = { patchPG };
  
