import { deleteAsync } from 'del';
import * as sass from 'sass';
import autoprefixer from 'gulp-autoprefixer';
import browsersync from 'browser-sync';
import cached from 'gulp-cached';
import cleancss from 'gulp-clean-css';
import fileinclude from 'gulp-file-include';
import gulp from 'gulp';
import gulpif from 'gulp-if';
import gulpSass from 'gulp-sass';
import npmdist from 'gulp-npm-dist';
import replace from 'gulp-replace';
import uglify from 'gulp-uglify';
import useref from 'gulp-useref';

const compileSass = gulpSass(sass);

browsersync.create();

const paths = {
  base: {
    base: {
      dir: './',
    },
    node: {
      dir: './node_modules',
    },
  },
  dist: {
    base: {
      dir: './dist',
    },
    libs: {
      dir: './dist/assets/libs',
    },
  },
  src: {
    base: {
      dir: './src',
      files: './src/**/*',
    },
    css: {
      dir: './src/assets/css',
      files: './src/assets/css/**/*',
    },
    html: {
      dir: './src',
      files: './src/**/*.html',
    },
    img: {
      dir: './src/assets/img',
      files: './src/assets/img/**/*',
    },
    js: {
      dir: './src/assets/js',
      files: './src/assets/js/**/*',
    },
    partials: {
      dir: './src/partials',
      files: './src/partials/**/*',
    },
    scss: {
      dir: './src/assets/scss',
      files: './src/assets/scss/**/*',
      main: './src/assets/scss/*.scss',
    },
    tmp: {
      dir: './src/.tmp',
      files: './src/.tmp/**/*',
    },
  },
};

function browsersyncServe(cb) {
  browsersync.init({
    server: {
      baseDir: [paths.src.tmp.dir, paths.src.base.dir, paths.base.base.dir],
    },
  });
  cb();
}

function browsersyncReload(cb) {
  browsersync.reload();
  cb();
}

function watchFiles() {
  gulp.watch(paths.src.scss.files, scss);
  gulp.watch([paths.src.js.files, paths.src.img.files], browsersyncReload);
  gulp.watch([paths.src.html.files, paths.src.partials.files], gulp.series(fileincludeTask, browsersyncReload));
}

function scss() {
  return gulp
    .src(paths.src.scss.main)
    .pipe(compileSass().on('error', compileSass.logError))
    .pipe(autoprefixer())
    .pipe(gulp.dest(paths.src.css.dir))
    .pipe(browsersync.stream());
}

function fileincludeTask() {
  return gulp
    .src([paths.src.html.files, '!' + paths.src.tmp.files, '!' + paths.src.partials.files])
    .pipe(
      fileinclude({
        prefix: '@@',
        basepath: '@file',
        indent: true,
      })
    )
    .pipe(cached())
    .pipe(gulp.dest(paths.src.tmp.dir));
}

async function cleanTmp(cb) {
  await deleteAsync([paths.src.tmp.dir]);
  cb();
}

async function cleanDist(cb) {
  await deleteAsync([paths.dist.base.dir]);
  cb();
}

function copyAll() {
  return gulp
    .src(
      [
        paths.src.base.files,
        '!' + paths.src.partials.dir,
        '!' + paths.src.partials.files,
        '!' + paths.src.scss.dir,
        '!' + paths.src.scss.files,
        '!' + paths.src.tmp.dir,
        '!' + paths.src.tmp.files,
        '!' + paths.src.js.dir,
        '!' + paths.src.js.files,
        '!' + paths.src.css.dir,
        '!' + paths.src.css.files,
        '!' + paths.src.html.files,
      ],
      { encoding: false }
    )
    .pipe(gulp.dest(paths.dist.base.dir));
}

function copyLibs() {
  return gulp
    .src(npmdist(), {
      base: paths.base.node.dir,
    })
    .pipe(gulp.dest(paths.dist.libs.dir));
}

function html() {
  return gulp
    .src([paths.src.html.files, '!' + paths.src.tmp.files, '!' + paths.src.partials.files])
    .pipe(
      fileinclude({
        prefix: '@@',
        basepath: '@file',
        indent: true,
      })
    )
    .pipe(replace(/href="(.{0,10})node_modules/g, 'href="$1assets/libs'))
    .pipe(replace(/src="(.{0,10})node_modules/g, 'src="$1assets/libs'))
    .pipe(useref())
    .pipe(cached())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', cleancss()))
    .pipe(gulp.dest(paths.dist.base.dir));
}

const build = gulp.series(cleanTmp, cleanDist, gulp.parallel(copyAll, copyLibs), scss, html);
const dev = gulp.series(gulp.parallel(fileincludeTask, scss), gulp.parallel(browsersyncServe, watchFiles));

export { cleanTmp, cleanDist, copyAll, copyLibs, html, build, dev as default };
