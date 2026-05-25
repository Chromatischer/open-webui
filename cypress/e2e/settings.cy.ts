// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../support/index.d.ts" />
import { adminUser } from '../support/e2e';

// These tests run through the various settings pages, ensuring that the user can interact with them as expected
describe('Settings', () => {
	// Wait for 2 seconds after all tests to fix an issue with Cypress's video recording missing the last few frames
	after(() => {
		// eslint-disable-next-line cypress/no-unnecessary-waiting
		cy.wait(2000);
	});

	beforeEach(() => {
		// Login as the admin user
		cy.loginAdmin();
		// Visit the home page
		cy.visit('/');
		// Click on the user menu
		cy.get('button[aria-label="User Menu"]').click();
		// Click on the settings link
		cy.get('button').contains('Settings').click();
	});

	context('General', () => {
		it('user can open the General modal and hit save', () => {
			cy.get('button').contains('General').click();
			cy.get('button').contains('Save').click();
		});
	});

	context('Design', () => {
		it('user can open the Design modal and hit save', () => {
			cy.get('button').contains('Design').click();
			cy.get('button').contains('Save').click();
		});
	});

	context('Chats', () => {
		it('user can open the Chats modal', () => {
			cy.get('button').contains('Chats').click();
		});
	});

	context('Account', () => {
		it('user can use Account settings from General', () => {
			cy.get('button').contains('General').click();
			cy.contains('Your Account');
			cy.get('button').contains('Save').click();
		});
	});

	context('About', () => {
		it('user can open the About modal', () => {
			cy.get('button').contains('About').click();
		});
	});
});
