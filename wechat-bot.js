// 导入所需的模块
const { WechatyBuilder } = require('wechaty'); // Wechaty 用于创建微信机器人
const qrcodeTerminal = require('qrcode-terminal'); // 用于在终端中显示二维码
const { chromium } = require('playwright'); // Playwright 用于网页自动化和内容提取
const { chatWithLLM } = require('./llm');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');
const { JSDOM } = require('jsdom');

// 创建微信机器人实例
const bot = WechatyBuilder.build();

// 定义扫描二维码事件的处理函数
async function onScan(qrcodeUrl, status) {
  // status 2 和 3 表示二维码可用
  if (status === 2 || status === 3) {
    // 在终端中生成二维码
    qrcodeTerminal.generate(qrcodeUrl, { small: true });
    console.log('请扫描上面的二维码进行登录');
    // 提供一个网页链接，以便在终端无法显示二维码时使用
    console.log(`或者访问此链接扫码：https://wechaty.js.org/qrcode/${encodeURIComponent(qrcodeUrl)}`);
  } else {
    // 如果二维码失效，打印提示信息
    console.log('二维码已失效，请重新启动程序');
  }
}

// 定义登录成功事件的处理函数
function onLogin(user) {
  // 打印登录成功用户名
  console.log(`${user.name()} 已成功登录`);
}

// 定义登出事件的处理函数
function onLogout(user) {
  // 打印已登出的用户名
  console.log(`${user.name()} 已登出`);
}

// 修改提取网页内容的函数
async function extractContent(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  
  const content = await page.evaluate(() => {
    return document.documentElement.outerHTML;
  });
  
  await browser.close();
  
  const doc = new JSDOM(content);
  const reader = new Readability(doc.window.document);
  const article = reader.parse();
  
  const turndownService = new TurndownService();
  const markdown = turndownService.turndown(article.content);
  
  return markdown;
}

// 修改接收消息事件的处理函数
async function onMessage(msg) {
  if (msg.self()) {
    return;
  }

  const contact = msg.talker();
  const contactName = contact.name();

  if (contactName === "无线翡翠台" && msg.text()) {
    try {
      console.log(`收到来自无线翡翠台的消息: ${msg.text()}`);
      
      let content = msg.text();
      
      // 检查消息是否是链接
      const urlRegex = /https?:\/\/[^\s]+/;
      const match = content.match(urlRegex);
      
      if (match) {
        const url = match[0];
        console.log(`检测到链接: ${url}`);
        content = await extractContent(url);
        console.log('已提取网页内容并转换为Markdown');
        
        // 使用LLM生成摘要
        content = await chatWithLLM(`请为以下Markdown内容生成一个简洁的摘要:\n\n${content}`);
        console.log('已生成Markdown内容的摘要');
      }
      
      const reply = await chatWithLLM(content);
      console.log(`LLM回复无线翡翠台: ${reply}`);
      await msg.say(reply);
    } catch (error) {
      console.error('处理无线翡翠台的消息时出错:', error);
      await msg.say('抱歉,处理您的消息时出现了错误。');
    }
  } else {
    console.log(`收到来自 ${contactName} 的消息,但不进行回复。`);
  }
}

// 注册事件处理函数
bot.on('scan', onScan); // 当需要扫码时
bot.on('login', onLogin); // 当成功登录时
bot.on('logout', onLogout); // 当登出时
bot.on('message', onMessage); // 当收到消息时

// 启动机器人
bot.start()
  .then(() => console.log('机器人启动成功')) // 如果启动成功，打印成功消息
  .catch(e => console.error('机器人启动失败:', e)); // 如果启动失败，打印错误信息
