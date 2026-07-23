export class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];

  register(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async runAll() {
    console.log(`Running ${this.tests.length} tests...`);
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`[PASS] ${test.name}`);
      } catch (err) {
        console.error(`[FAIL] ${test.name}`, err);
      }
    }
  }
}
