const groupDao = require("../dao/groupDao");
const userDao = require('../dao/userDao');

const toCents = (value) => Math.round(Number(value) * 100);

const buildEqualSplits = (members, totalAmount) => {
    const totalCents = toCents(totalAmount);
    const baseShare = Math.floor(totalCents / members.length);
    const remainder = totalCents % members.length;

    return members.map((memberEmail, index) => ({
        memberEmail,
        amount: (baseShare + (index < remainder ? 1 : 0)) / 100
    }));
};

const buildCustomSplits = (members, totalAmount, splits) => {
    const sanitizedSplits = Array.isArray(splits) ? splits : [];
    const memberSet = new Set(members);
    const usedMembers = new Set();

    const normalized = sanitizedSplits.map((entry) => {
        const memberEmail = (entry?.memberEmail || "").trim();
        const amount = Number(entry?.amount);
        return { memberEmail, amount };
    });

    if (normalized.length !== members.length) {
        throw new Error("Custom split must include all members");
    }

    for (const split of normalized) {
        if (!memberSet.has(split.memberEmail)) {
            throw new Error("Custom split contains unknown member");
        }
        if (usedMembers.has(split.memberEmail)) {
            throw new Error("Duplicate member in custom split");
        }
        if (!Number.isFinite(split.amount) || split.amount < 0) {
            throw new Error("Each custom split amount must be >= 0");
        }
        usedMembers.add(split.memberEmail);
    }

    const splitTotalCents = normalized.reduce(
        (sum, split) => sum + toCents(split.amount),
        0
    );
    if (splitTotalCents !== toCents(totalAmount)) {
        throw new Error("Custom splits must total the expense amount");
    }

    return normalized.map((split) => ({
        memberEmail: split.memberEmail,
        amount: toCents(split.amount) / 100
    }));
};

const groupController = {

    create: async (request, response) => {
        try {
            const user = request.user;
            const { name, description, membersEmail, thumbnail } = request.body;

            const UserInfo = await userDao.findByEmail(user.email);

            //This is to ensure backward compatibility for already created users
            // not having credits attribute.

            if (userInfo.credits === undefined) {
                userInfo.credits = 1;
            }

            if (Number(userInfo.credits) === 0) {

                return response.status(400).json({

                    message: 'You do not have enough credits to perform this operation'

                });
            }

            let allMembers = [user.email];
            if (membersEmail && Array.isArray(membersEmail)) {
                allMembers = [...new Set([...allMembers, ...membersEmail])];
            }

            const newGroup = await groupDao.createGroup({
                name,
                description,
                adminEmail: user.email,
                membersEmail: allMembers,
                thumbnail,
                paymentStatus: {
                    amount: 0,
                    currency: 'INR',
                    date: Date.now(),
                    isPaid: false
                }
            });

            response.status(201).json({
                message: 'Group created successfully',
                groupId: newGroup._id
            });
        } catch (error) {
            console.error(error);
            response.status(500).json({ message: "Internal server error" });
        }
    },

    update: async (request, response) => {
        try {
            const updatedGroup = await groupDao.updateGroup(request.body);
            if (!updatedGroup) {
                return response.status(404).json({ message: "Group not found" });
            }
            response.status(200).json(updatedGroup);
        } catch (error) {
            response.status(500).json({ message: "Error updating group" });
        }
    },

    addMembers: async (request, response) => {
        try {
            const { groupId, emails } = request.body;
            const updatedGroup = await groupDao.addMembers(groupId, ...emails);
            response.status(200).json(updatedGroup);
        } catch (error) {
            response.status(500).json({ message: "Error adding members" });
        }
    },

    removeMembers: async (request, response) => {
        try {
            const { groupId, emails } = request.body;
            const updatedGroup = await groupDao.removeMembers(groupId, ...emails);
            response.status(200).json(updatedGroup);
        } catch (error) {
            response.status(500).json({ message: "Error removing members" });
        }
    },

    getGroupsByUser: async (request, response) => {
        try {
            const email = request.user.email;
            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.query.limit) || 10;
            const skip = (page - 1) * limit;

            const sortBy = request.query.sortBy || 'newest';
            let sortOptions = { createdAt: -1 };

            if (sortBy === 'oldest') {
                sortOptions = { createdAt: 1 };
            }

            const { groups, totalCount } = await groupDao.getGroupsPaginated(email, limit,
                skip, sortOptions);

            response.status(200).json({
                groups: groups,
                pagination: {
                    totalItems: totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    currentPage: page,
                    itemsPerPage: limit
                }
            });
        } catch (error) {
            console.error("Error fetching groups:", error);
            response.status(500).json({ message: "Error fetching groups" });
        }
    },

    getGroupsByPaymentStatus: async (request, response) => {
        try {
            const { isPaid } = request.query;
            const status = isPaid === 'true';
            const groups = await groupDao.getGroupByStatus(status);
            response.status(200).json(groups);
        } catch (error) {
            response.status(500).json({ message: "Error filtering groups" });
        }
    },

    getAudit: async (request, response) => {
        try {
            const { groupId } = request.params;
            const lastSettled = await groupDao.getAuditLog(groupId);
            response.status(200).json({ lastSettled });
        } catch (error) {
            response.status(500).json({ message: "Error fetching audit log" });
        }
    },

    getGroupDetails: async (request, response) => {
        try {
            const { groupId } = request.params;
            const email = request.user.email;
            const group = await groupDao.getGroupDetailsForMember(groupId, email);

            if (!group) {
                return response.status(404).json({
                    message: "Group not found or access denied"
                });
            }

            const transactions = [...(group.expenses || [])].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            response.status(200).json({
                group: {
                    _id: group._id,
                    name: group.name,
                    description: group.description,
                    adminEmail: group.adminEmail,
                    membersEmail: group.membersEmail
                },
                transactions
            });
        } catch (error) {
            response.status(500).json({ message: "Error fetching group details" });
        }
    },

    addExpense: async (request, response) => {
        try {
            const { groupId } = request.params;
            const { title, amount, paidBy, splitType, splits } = request.body;
            const email = request.user.email;

            const group = await groupDao.getGroupDetailsForMember(groupId, email);
            if (!group) {
                return response.status(404).json({
                    message: "Group not found or access denied"
                });
            }

            const expenseTitle = (title || "").trim();
            const numericAmount = Number(amount);

            if (!expenseTitle) {
                return response.status(400).json({ message: "Title is required" });
            }
            if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                return response.status(400).json({
                    message: "Amount must be greater than 0"
                });
            }
            if (!group.membersEmail.includes(paidBy)) {
                return response.status(400).json({
                    message: "Payer must be a group member"
                });
            }
            if (!["equal", "custom"].includes(splitType)) {
                return response.status(400).json({
                    message: "Split type must be equal or custom"
                });
            }

            const normalizedAmount = toCents(numericAmount) / 100;
            let normalizedSplits;

            if (splitType === "equal") {
                normalizedSplits = buildEqualSplits(
                    group.membersEmail,
                    normalizedAmount
                );
            } else {
                try {
                    normalizedSplits = buildCustomSplits(
                        group.membersEmail,
                        normalizedAmount,
                        splits
                    );
                } catch (error) {
                    return response.status(400).json({ message: error.message });
                }
            }

            const expensePayload = {
                title: expenseTitle,
                amount: normalizedAmount,
                paidBy,
                splitType,
                splits: normalizedSplits,
                createdBy: email
            };

            const updatedGroup = await groupDao.addExpenseToGroup(
                groupId,
                email,
                expensePayload
            );

            const transactions = [...(updatedGroup.expenses || [])].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            response.status(201).json({
                message: "Expense added successfully",
                transactions
            });
        } catch (error) {
            response.status(500).json({ message: "Error adding expense" });
        }
    }
};

module.exports = groupController;
