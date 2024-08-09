import puppeteer from "puppeteer";
import fs from "fs";
import fetch from "node-fetch";
const wordCount = require("./wordCount.json");

async function scrap() {
  // Or import puppeteer from 'puppeteer-core';
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Enable request interception and abort requests for fonts, images, JavaScript, css, etc.
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (
      ["image", "stylesheet", "font", "script", "other"].indexOf(
        request.resourceType()
      ) !== -1
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });
  loop: for (const chapter in wordCount) {
    try {
      for (const verse in wordCount[chapter]) {
        for (let word = 1; word <= +wordCount[chapter][verse]; word++) {
          if (
            //check if file already exists
            await fs.promises
              .access(`./wordImage/${chapter}:${verse}:${word}.png`)
              .then(() => true)
              .catch(() => false)
          ) {
            continue;
          }

          await page.goto(
            `https://corpus.quran.com/wordmorphology.jsp?location=(${chapter}:${verse}:${word})`
          );

          const imgSrc = await page.$eval(
            "body > table.pageTemplate > tbody > tr:nth-child(4) > td.contentCell > div > form > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(2) > a > img",
            (img) => {
              return img.getAttribute("src");
            }
          );
          await fetch("https://corpus.quran.com" + imgSrc).then((res) => {
            try {
              console.log(`${chapter}:${verse}:${word}`);
              res.body.pipe(
                fs.createWriteStream(
                  `./wordImage/${chapter}:${verse}:${word}.png`
                )
              );
            } catch (error) {
              console.log(error);
            }
          });
          if (
            //check if file doesn't exists
            await fs.promises
              .access(`./wordImage/${chapter}:${verse}:${word}.png`)
              .then(() => false)
              .catch(() => true)
          ) {
            scrap();
            break loop;
          }
        }
      }
    } catch (error) {
      console.log(error);
      await new Promise((resolve) => setTimeout(() => resolve(true), 10000));
      scrap();
      break loop;
    }
  }
  await browser.close();
}
await scrap();
