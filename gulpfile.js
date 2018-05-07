const gulp = require('gulp');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const using = require('gulp-using');
const rename = require("gulp-rename");
const ejs = require("gulp-ejs");
const fs = require("fs");
const Stream = require('stream');

gulp.task('default', ['css']);

const witchDir = ["timetable", "search"];
let filePath = '';

gulp.task('css', function () {
    return gulp.src(['/'+ witchDir[1] +'/scss'])
        .pipe(using())
        .pipe(plumber({
            errorHandler: notify.onError("Error: <%= error.message %>")
        }))
        .pipe(sass())
        .pipe(rename(function(path) {
            path.extname = '.css';
            path.basename = 'style';
        }))
        .pipe(gulp.dest('./'));
});

gulp.task("ejs", function() {
    return gulp.src(
        ["ejs/origin/*.ejs"] //参照するディレクトリ、出力を除外するファイル
    )
        .pipe(using())
        .pipe(plumber({
            errorHandler: notify.onError("Error: <%= error.message %>")
        }))
        .pipe(ejs({}))
        .pipe(getFileName(filePath))
        .pipe(rename(function(path) {
            console.log(filePath);
            let pathArr = filePath.substr(0, filePath.length-4).split('\\');
            let lastDir = pathArr[pathArr.length-1];
            console.log(lastDir);
            path.dirname = lastDir;
            path.extname = '.html';
            path.basename = 'index';
        }))
        .pipe(gulp.dest("./public/"));
});

function getFileName() {
    let stream = new Stream.Transform({ objectMode: true });
    stream._transform = function(file, unused, callback) {
        filePath = file.path;
        callback(null, file);
    };
    return stream;
}