"use strict";

System.register([], function (_export, _context) {
    "use strict";

    return {
        setters: [],
        execute: function () {
            _export('default', {

                /**
                 * ListCategory
                 * @param {String} ProjectName Project 名称,全局唯一
                 * @param {Function} fn callback function, fn(err, data, status, headers)
                 */
                ListCategory: function ListCategory(ProjectName, fn) {
                    this.requestData('GET', '/ListCategory', {}, {
                        Project: ProjectName
                    }, fn);
                },

                /**
                 * ListTopic
                 * @param {String} ProjectName Project 名称,全局唯一
                 * @param {Object} opt
                 * @param {String} opt.Category 必选, 日志类型（用户所有日志类型可以通过 ListCategory 获得）
                 * @param {Function} fn callback function, fn(err, data, status, headers)
                 */
                ListTopic: function ListTopic(ProjectName, opt, fn) {

                    this.requestData('GET', '/ListTopic', {}, {
                        Project: ProjectName,
                        Category: opt.Category,
                        Token: opt.Token,
                        Lines: opt.Lines || 200
                    }, fn);
                },

                /**
                 * GetData
                 * @param {String} ProjectName Project 名称,全局唯一
                 * @param {Object} opt
                 * @param {String} opt.Category 必选, 日志类型（用户所有日志类型可以通过 ListCategory 获得）
                 * @param {String} opt.Topic  可选, 指定日志主题（用户所有主题可以通过 ListTopic 获得）
                 * @param {Integer} opt.BeginTime 必选, 开始时间（精确到秒，使用 linux 累计时间格式）
                 * @param {Integer} opt.EndTime  可选, 结束时间（精确到秒，使用 linux 累计时间格式）
                 * @param {boolean} opt.Reverse 可选, 是否反向读取，只能为 true 或者 false，不区分大小写
                 *                 （默认 false，为正向读取，即从 BeginTime 开始到 EndTime 之间读取 Lines 条）
                 * @param {Integer} opt.Lines  可选, 读取的行数，默认值为 200
                 * @param {Integer} opt.Offset  可选, 读取起始位置，默认值为 0
                 * @param {String} opt.Query 可选, 查询的关键词，不输入关键词，则查询全部日志数据
                 * @param {Function} fn callback function, fn(err, data, status, headers)
                 */
                GetData: function GetData(ProjectName, opt, fn) {
                    opt.Project = ProjectName;
                    this.requestData('GET', '/GetData', {}, opt, fn);
                },

                /**
                 * GetDataMeta
                 * @param {String} ProjectName Project 名称,全局唯一
                 * @param {Object} opt
                 * @param {String} opt.Category 必选, 日志类型（用户所有日志类型可以通过 ListCategory 获得）
                 * @param {String} opt.Topic  可选, 指定日志主题（用户所有主题可以通过 ListTopic 获得）
                 * @param {Integer} opt.BeginTime 必选, 开始时间（精确到秒，使用 linux 累计时间格式）
                 * @param {Integer} opt.EndTime  可选, 结束时间（精确到秒，使用 linux 累计时间格式）
                 * @param {String} opt.Query 可选, 查询的关键词，不输入关键词，则查询全部日志数据
                 * @param {Function} fn callback function, fn(err, data, status, headers)
                 */
                GetDataMeta: function GetDataMeta(ProjectName, opt, fn) {
                    opt.Project = ProjectName;
                    this.requestData('GET', '/GetDataMeta', {}, opt, fn);
                }

            });
        }
    };
});
//# sourceMappingURL=api.js.map
