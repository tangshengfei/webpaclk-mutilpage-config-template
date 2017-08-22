const path = require("path");
const webpack = require("webpack");
const glob = require("glob");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
const Uglify = webpack.optimize.UglifyJsPlugin;
const CommonsChunkPlugin = webpack.optimize.CommonsChunkPlugin;

// dev port
const PORT = 3000;
const HOME_PAGE = "home";

const getFiles = ( src, replaceDir = "") => {
    let files = glob.sync(src);
    let map = {};

    files.forEach(( file )=>{
        let dirname = path.dirname(file);
        let extname = path.extname(file);
        let basename = path.basename(file, extname);
        let pathname = path.normalize(path.join(dirname, basename));
        let pathDir = path.normalize(replaceDir);

        if ( pathname.startsWith(pathDir) ) {
            pathname = pathname.substring(pathDir.length)
        }
        map[pathname] = [file];
    });

    return map;
};

const entries = getFiles("./src/scripts/**/*.js", 'src/scripts/');
const chunks = Object.keys(entries);
const config = {
    entry: entries,
    output: {
        path: path.join(__dirname, "/build"),
        filename: "scripts/[name].js",
        publicPath: "/scripts/",
        chunkFilename: "scripts/[id].chunk.js"
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({
                    fallback:"style-loader",
                    use: "css-loader"
                })
            },
            {
                test: /\.less$/,
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: ['css-loader','less-loader']
                })
            }, 
            {
                test: /\.html$/,
                loader: 'html-loader?-minimize' // 避免压缩html,https://github.com/webpack/html-loader/issues/50
            },
            {
                test: /\.(woff|woff2|ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader?name=assets/fonts/[name].[ext]'
            },
            {
                test: /\.(png|jpe?g|gif)$/,
                loader: 'url-loader?limit=8192&name=assets/images/[name]-[hash].[ext]'
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                  }
            }
        ]
    },
    resolve: {
        alias: {
            "@style": path.join(__dirname, "src/styles"),
            "@js": path.join(__dirname, "src/scripts")
        },
        extensions: ['.js', '.jsx', '.css', '.less', '.sass', '.scss']
    },
    devtool: "source-map",
    performance: {
        hints: "warning"
    },
    plugins: [
        new ExtractTextPlugin('styles/[name].css'),
        new Uglify({
            warnings: false,
            comments: false,
            compress: true
        }),
        new CommonsChunkPlugin({
            name: 'vendors', // 将公共模块提取，生成名为`vendors`的chunk
            chunks: chunks,
            minChunks: chunks.length, // 提取所有entry共同依赖的模块
            filename: "scripts/common/vender.js"
        }),
        new OpenBrowserPlugin({ url: `http://localhost:${PORT}` })
    ],
    devServer: {
        port: PORT,
        contentBase: path.resolve(__dirname, "./build"),
        hot: true,
        compress: true,
        index: "index.html",
        watchOptions: {
            watchContentBase: true,
            redirect: false,
            watch: true
        },
        historyApiFallback: {
            rewrites: []
        }
    }
};

// 动态添加路由重写表
;(function(){
    const pageModules = Object.keys(getFiles("./src/pages/**/",'src/pages/'));
    pageModules.shift();
    pageModules.forEach((page) => {

        config.devServer.historyApiFallback.rewrites.push({
            from: new RegExp("^/"+page+""),
            to: "/pages/"+page+"/index.html"
        });
    });
    config.devServer.historyApiFallback.rewrites.push({
        from: /^\/$/,
        to: `/pages/${HOME_PAGE}/index.html`
    });
    console.log('rewite:router::::', config.devServer.historyApiFallback.rewrites);
})();

const pages = getFiles("./src/pages/**/*.html", 'src/pages/');
Object.keys(pages).forEach(( page ) => {
    var conf = {
        filename: "pages/"+page+".html",
        template: "./src/pages/"+page+".html",
        inject: false
    };

    if ( page in config.entry ) {
        conf.inject = 'body';
        conf.chunks = ['vendors', page];
        conf.hash = true;
    }

    config.plugins.push(new HtmlWebpackPlugin(conf));
});

module.exports = config;