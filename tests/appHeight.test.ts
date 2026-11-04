import assert from 'node:assert/strict'
import { test } from 'node:test'

import { appHeightFrom } from '../src/lib/appHeight.ts'

// iPhone 17e: 390 × 844 CSS px, iOS reports screen size in portrait orientation.
const iphone17e = { innerWidth: 390, screenWidth: 390, screenHeight: 844 }

test('home-screen app on the iPhone fills the screen even if iOS reports less at launch', () => {
  const height = appHeightFrom({
    ...iphone17e,
    innerHeight: 763,
    clientHeight: 763,
    visualHeight: 763,
    iphoneStandalone: true,
  })
  assert.equal(height, 844)
})

test('in landscape the shorter screen side is the height', () => {
  const height = appHeightFrom({
    innerWidth: 844,
    innerHeight: 360,
    clientHeight: 360,
    visualHeight: 360,
    screenWidth: 390,
    screenHeight: 844,
    iphoneStandalone: true,
  })
  assert.equal(height, 390)
})

test('in the browser only measured values count, toolbars are not part of the page', () => {
  const height = appHeightFrom({
    ...iphone17e,
    innerHeight: 700,
    clientHeight: 696,
    visualHeight: 690,
    iphoneStandalone: false,
  })
  assert.equal(height, 700)
})

test('never smaller than what the browser measures', () => {
  const height = appHeightFrom({
    ...iphone17e,
    innerHeight: 860,
    clientHeight: 844,
    visualHeight: 844,
    iphoneStandalone: true,
  })
  assert.equal(height, 860)
})
