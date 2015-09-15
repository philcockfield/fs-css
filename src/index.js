import _ from "lodash";
import crypto from "crypto";
import fs from "fs-extra";
import fsPath from "path";
import * as fsLocal from "./fs";
import compile from "./compile";

const EXTENSIONS = [".styl", ".css"];



export default {
  /**
   * Starts a compiler for the given path(s).
   * @param {string|array} paths: The file-system paths to compile.
   * @param {object} options:
   *                    - watch: Flag indicating if file-system watching is enabled.
   *                             When on the cache is invaidated when the source files are changed.
   *                             - True: default for 'development'
   *                             - Fase: default for 'production'
   */
  compile(paths, options = {}) {
    // Prepare the paths.
    if (!_.isArray(paths)) { paths = _.compact([paths]); }
    if (paths.length === 0) { throw new Error(`File-system 'path' was not specified.`); }
    paths = _.chain(paths)
        .flatten(true)
        .map(path => _.startsWith(path, ".") ? fsPath.resolve(path) : path)
        .compact()
        .unique()
        .value();
    paths.forEach(path => {
          if (!fs.existsSync(path)) { throw new Error(`The CSS folder path '${ path }' does not exist.`); }
          if (!fs.lstatSync(path).isDirectory()) { throw new Error(`The CSS folder path '${ path }' is not a directory.`); }
      });

    // Retrieve source file paths.
    paths.sourceFiles = _.chain(paths)
        .map(path => fsLocal.childPaths(path))
        .flatten()
        .filter(path => _.contains(EXTENSIONS, fsPath.extname(path)))
        .value();


    // Store the build path.
    let buildPath = options.buildPath;
    if (!_.isString(buildPath)) {
      const hash = crypto.createHash("md5")
      paths.forEach(path => hash.update(path));
      buildPath = fsPath.join(__dirname, "../.build", hash.digest("hex"));
    } else {
      buildPath = fsPath.resolve(buildPath);
    }
    paths.build = buildPath;


    // Prepare options parameters.
    options.watch = options.watch === undefined
        ? (process.env.NODE_ENV !== "production")
        : options.watch;


    // Construct the return promise.
    const promise = compile(paths.sourceFiles);
    promise.options = options;
    promise.paths = paths;


    // Finish up.
    return promise;
  }
};
