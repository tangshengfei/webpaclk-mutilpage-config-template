const path = require("path");
const webpack = require("webpack");
const glob = require("glob");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
const Uglify = webpack.optimize.UglifyJsPlugin;
const CommonsChunkPlugin = webpack.optimize.CommonsChunkPlugin;

// dev port
const PORT = 4000;
const HOME_PAGE = "home";

const IS_PRODUCTION = process.env.NODE_ENV === "prodution";

const getFiles = ( src, replaceDir = "") => {
    let files = glob.sync(src);
    let map = {};

    files.forEach(( file ) => {
        let dirname = path.dirname(file);
        let extname = path.extname(file);
        let basename = path.basename(file, extname);
        let pathname = path.normalize(path.join(dirname, basename));
        let pathDir = path.normalize(replaceDir);

        if ( pathname.startsWith(pathDir) ) {
            pathname = pathname.substring(pathDir.length)
        }
        map[pathname.replace(/\\/g, '/')] = [file];
    });
    return map;
};

const entries = getFiles("./src/pages/**/*.js", 'src/pages/');
entries.vendors = ["vue"]
const chunks = Object.keys(entries);
const config = {
    entry: entries,
    output: {
        path: path.join(__dirname, "/build"),
        filename: "pages/[name].js",
        publicPath: "/",
        chunkFilename: "pages/[id].chunk.js?[chunkHash]"
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
            },
            {
                test: /\.vue$/,
                exclude: /node_modules/,
                loader: "vue-loader",
                options: {
                    sourceMap: true,
                    loaders: {
                        css: ExtractTextPlugin.extract({
                            use: 'css-loader',
                            fallback: 'vue-style-loader' // <- 这是vue-loader的依赖，所以如果使用npm3，则不需要显式安装
                        })
                    },
                    postLoaders: {
                        html: 'babel-loader'
                    }
                }
            }
        ]
    },
    resolve: {
        alias: {
            "@style": path.join(__dirname, "src/assets/css"),
            "@js": path.join(__dirname, "src/assets/js"),
            "vue": "vue/dist/vue.js",
            "@components": path.join(__dirname, "src/assets/components")
        },
        extensions: ['.js', '.jsx', '.css', '.less', '.sass', '.scss', '.vue']
    },
    devtool: "source-map",
    performance: {
        hints: false
    },
    plugins: [
        new ExtractTextPlugin('pages/[name].css'),
        new CommonsChunkPlugin({
            name: 'vendors', // 将公共模块提取，生成名为`vendors`的chunk
            chunks: chunks,
            minChunks: chunks.length, // 提取所有entry共同依赖的模块
            filename: "assets/js/vender.js"
        }),
        new OpenBrowserPlugin({ url: `http://localhost:${PORT}` })
    ]
};

const pages = getFiles("./src/pages/**/*.html", 'src/pages/');
Object.keys(pages).forEach(( page ) => {
    var conf = {
        filename: "pages/"+page+".html",
        template: "./src/pages/"+page+".html",
        inject: false,
        cache: false
    };

    if ( page in config.entry ) {
        conf.inject = 'body';
        conf.chunks = ['vendors', page];
        conf.hash = true;
    }
    config.plugins.push(new HtmlWebpackPlugin(conf));
});

module.exports = function (env) {
    if ( env === "production" ) {
        config.plugins.push(
            new Uglify({
                warnings: false,
                comments: false,
                compress: true
            })
        )
    } else {
        // 开发环境
        config.devtool = "#cheap-module-source-map";
        config.devServer = {
            port: PORT,
            index: "index.html",
            compress: true,
            contentBase: path.resolve(__dirname, "./src"),
            watchOptions: {
                watchContentBase: true,
                redirect: false,
                watch: true,
                poll: 1000,
                aggregateTimeout: 300 // 默认值
            },
            watchContentBase: true,
            historyApiFallback: {
                rewrites: []
            }
        }

        // 动态重写路由表
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
            
        })();

    }

    return config;
};
