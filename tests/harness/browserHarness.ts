export class BrowserHarness {
  async openTab(url: string) {
    return { id: 'test_tab', url };
  }
}
