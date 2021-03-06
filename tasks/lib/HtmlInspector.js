/*global require:true, process:true, phantomjs:true, __dirname:true*/

var grunt = require('grunt'),
    path = require('path'),
    _ = grunt.util._;

var HtmlInspector = function HtmlInspector(task, phantomjs) {
    this.setOptions(task);
    this.filesSrc = task.filesSrc;
    this.async = task.async;
    this.phantomjs = phantomjs;
};

_.extend(HtmlInspector.prototype, (function () {
    'use strict';
    /*jshint validthis:true */
    
    var isPass = true;

    function onComplete(errors) {
        var i = 0,
            count = errors && errors.length ? errors.length : 0;

        isPass = (count === 0);

        this.phantomjs.halt();
        
        if (!isPass) {
            grunt.log.warn(('Failed ' + errors.length + ' rule(s)!').red);
            isPass = false;
            for (; i < count; i++) {
                grunt.log.writeln('\n \u250c Failed rule "' + errors[i].rule + '".');
                grunt.log.writeln(' \u2514 ' + errors[i].message);
            }
            grunt.log.writeln(' ');
        }
        else {
            grunt.log.writeln(('Passed HTMLInspector.').green);
        }
    }
    
    function onFailLoad(url) {
        this.phantomjs.halt();
        grunt.warn('Unable to load url "' + url + '".');
    }
    
    function onFailTimeout() {
        this.phantomjs.halt();
        grunt.warn('Timeout reached. Possible issue with page load or missing script.');
    }

    function setOptions(task) {
        this.options = task.options({
            parameters: null,
            phantomOptions: { }
        });
    }
    
    function run() {
        var self = this,
            options = self.options,
            phantomjs = self.phantomjs,
            markTaskComplete = self.async(),
            inject = [];

        if (!self.filesSrc) {
            grunt.fatal('Path to test page(s) was not specified, please use the "src" grunt parameter.');
        }

        inject.push(path.join(__dirname, '../includes', 'html-inspector.js'));

        if (options.bridge) {
            inject.push(options.bridge);
        }
        else {
            inject.push(path.join(__dirname, '../includes', 'bridge.js'));
        }

        options.phantomOptions.inject = inject;

        if (options.parameters) {
            self.src += (self.src.indexOf('?') === -1 ? '?' : '&') + options.parameters;
        }
        
        phantomjs.on('htmlinspector.done', onComplete.bind(self));
        phantomjs.on('fail.load', onFailLoad.bind(self));
        phantomjs.on('fail.timeout', onFailTimeout.bind(self));
        
        grunt.util.async.forEachSeries(self.filesSrc, function spawnPhantomJs(url, next) {
            grunt.log.writeln('Testing ' + url + ' ');

            phantomjs.spawn(url, (function defineOptions() {
        
                function done(er) {
                    if (er) {
                        markTaskComplete(false);
                    }
                    else {
                        next();
                    }
                }
            
                return {
                    options: options.phantomOptions,
                    done: done
                };
            
            }()));
        }, function allFilesTested(er) {
            if (er) {
                markTaskComplete(false);
            }
            else {
                markTaskComplete();
            }
        });
    }

    return {
        setOptions: setOptions,
        run: run
    };

}()));

HtmlInspector.registerWithGrunt = function registerWithGrunt(grunt) {
    var phantomjs = require('grunt-lib-phantomjs').init(grunt);
    
    grunt.registerMultiTask('html-inspector', '', function() {
        var task = new HtmlInspector(this, phantomjs);
        
        task.run();
    });
};

module.exports = HtmlInspector;
