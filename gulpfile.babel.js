"use strict";
import gulp from 'gulp';
import babel from 'gulp-babel';

gulp.task('prepublish', ['babel']);

gulp.task('babel', () => {
  return gulp.src('src/**/*.es6')
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(gulp.dest('lib'));
});

gulp.task('default', ['babel']);
