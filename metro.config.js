const {getDefaultConfig}=require('expo/metro-config');
const {realpathSync}=require('node:fs');
const path=require('node:path');
const config=getDefaultConfig(__dirname);
// npm's file: dependency is a symlink. Include its real target when node_modules
// is shared by a local worktree so Metro can resolve it outside the project root.
const decoder=realpathSync(path.join(__dirname,'node_modules/decode-uri-component'));
config.watchFolders=[...config.watchFolders,decoder];
module.exports=config;
