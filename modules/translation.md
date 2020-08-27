---
description: google translation ftw
---

# Translation

## How it works

Translation is a relatively simple module that allows anyone in the server to react to a person's message with flag emojis to translate their text to the corresponding language!

![](../.gitbook/assets/image%20%281%29.png)

Keep in mind that this uses the Google Translate API and we do not provide free usage of this.

In order to get a free tier google translate api key, go [here](https://cloud.google.com/translate/docs/setup) and follow the guide.

{% hint style="info" %}
If you do not intend to use this module, please keep it disabled.
{% endhint %}

## Configuration

```text
{
	"modules": {
		"translation": {
			"enabled": true,
			"googleApi": {
				key: 'YOUR API KEY'
			}
		}
	}
}
```

Just define your API key in the above space, and it should just work.

## Commands

There are currently no commands for this module.



