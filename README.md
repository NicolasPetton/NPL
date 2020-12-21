# NPL

Nico's Plugin Library is a TiddlyWiki plugin library containing up-to-date
plugins built on our servers from upstream source.

* *Extensible* – Contribute new recipes, and we'll build the plugins.
* *Automatic updates* – New git tags result in new plugins.
* *Stable* – It only contains stable releases of plugins.

## Contributing recipes

Plugins are specified by files in the recipes directory. You can contribute a
new plugin by adding a new JSON file under recipes using the following format:

```
{
	"name": "PLUGIN_NAME",
	"repository": "https://github.com/ME/MYPLUGIN.git",
	"pluginPath": "PATH_OF_THE_PLUGIN"
}
```

* `name`: Name of the plugin.
* `repository`: Git repository of the plugins
* `pluginPath`: Path of the plugin within the git repository, usually something like plugins/my-plugin
