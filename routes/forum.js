const router = require('express').Router();
const forum = require('../modules/forum');
const { uniqueArray } = require('../modules/utils');
const logger = require('../modules/logger');
const roles = require('../modules/perms');
const perms = require('../configs/permissions');

exports.baseRoute = '/forums';

router.get('/', roles.minForumRole(perms.forums.view_forums), async (req, res) => {
    const forums = await forum.getForums();
    const categories = await forum.getCategories();
    const categoryIds = categories.map(a => a.id);
    const forumIds = forums.map(a => a.id);
    const categoryOrder = req.cookies.categoryOrder;
    const forumOrder = req.cookies.forumOrder;

    if (categoryOrder) {
        // Remove non-existent ids from cookie
        categoryOrder.forEach((e, i) => {
            if (!categoryIds.includes(e)) categoryOrder.splice(i, 1);
        });

        // Append new category IDs to cookie
        categoryIds.forEach((e) => {
            if (!categoryOrder.includes(e)) categoryOrder.push(e);
        });

        // Sort categories to user's specifications
        const catorder = {};
        categoryOrder.forEach((e, i) => catorder[e] = i);
        categories.sort(function (a, b) {
            return catorder[a.id] - catorder[b.id];
        });

        res.cookie('categoryOrder', categoryOrder, { maxAge: 159325993469598, httpOnly: true, overwrite: true });
    }

    if (forumOrder) {
        // Remove non-existent ids from cookie
        forumOrder.forEach((e, i) => {
            if (!forumIds.includes(e)) forumOrder.splice(i, 1);
        });

        // Append new forum IDs to cookie
        forumIds.forEach((e) => {
            if (!forumOrder.includes(e)) forumOrder.push(e);
        });

        // Sort forums to user's specifications
        const forder = {};
        forumOrder.forEach((e, i) => forder[e] = i);
        forums.sort(function (a, b) {
            return forder[a.id] - forder[b.id];
        });

        res.cookie('forumOrder', forumOrder, { maxAge: 159325993469598, httpOnly: true, overwrite: true });
    }

    res.render('forum/categories', {title: "Forums", forums: forums, categories: categories});
});

router.get('/:slug', async (req, res) => {
    const parent_id = req.params.slug .split('-')[0];
    if (!parent_id) return res.sendStatus(404);
    const forum = await forum.getForum(parent_id);
    const childForums = await forum.getForums(parent_id);
    const threads = await forums.getThreads(parent_id);
    res.render('forum/forum', {title: forum[0].title, childForums: childForums, threads: threads});
});

router.post('/', roles.minForumRole(perms.forums.create_forum), async (req, res) => {
    const newForum = req.body.forum;
    const category = await forum.getCategory(newForum.category).catch(logger.error);
    await forum.newForum(newForum.title, newForum.description, category.id, newForum.locked).catch(logger.error);
    res.send(true);
});

router.delete('/category', roles.minForumRole(perms.forums.delete_category), async (req, res) => {
    const category_id = req.query.category_id;
    if (!category_id) return res.status(403).sned(false);
    await forum.deleteCategory(category_id);
    res.send(true);
});

router.post('/category', roles.minForumRole(perms.forums.rename_category), async (req, res) => {
    const category_id = req.body.category_id;
    const name = req.body.name;
    if (!name || !category_id) return res.status(403).send(false);
    await forum.renameCategory(category_id, name);
    res.send(true);
});

router.post('/reorder', roles.minForumRole(perms.forums.reorder_forum), async (req, res) => {
    let forumOrder = req.body.forum_array.map(a => parseInt(a));
    let newForumOrder = forumOrder;
    const currentForumOrder = req.cookies.forumOrder || [];

    newForumOrder = forumOrder.concat(currentForumOrder.filter(ele => !forumOrder.includes(ele)));

    res.cookie('forumOrder', newForumOrder, { maxAge: 159325993469598, httpOnly: true, overwrite: true });
    res.send(true);
});

router.post('/reorderweight', roles.minForumRole(perms.forums.reorder_default_forum), async (req, res) => {
    const forumOrder = req.body.forum_array.map(a => parseInt(a));
    await forum.changeForumWeights(forumOrder);
    res.send(true);
});

router.post('/category/reorder', roles.minForumRole(perms.forums.reorder_category), async (req, res) => {
    const categoryOrder = req.body.category_array.map(a => parseInt(a));
    res.cookie('categoryOrder', categoryOrder, { maxAge: 159325993469598, httpOnly: true, overwrite: true });
    res.send(true);
});

router.post('/category/reorderweight', roles.minForumRole(perms.forums.reorder_default_category), async (req, res) => {
    const categoryOrder = req.body.category_array.map(a => parseInt(a));
    await forum.changeCategoryWeights(categoryOrder);
    res.send(true);
});

exports.router = router;
